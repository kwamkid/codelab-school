// lib/utils/availability.ts

import { 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { isHoliday } from '@/lib/services/holidays';
import { getClasses } from '@/lib/services/classes';
import { getMakeupClasses } from '@/lib/services/makeup';
import { getTrialSessions } from '@/lib/services/trial-bookings';

export interface AvailabilityCheckResult {
  available: boolean;
  reasons: AvailabilityIssue[];
}

export interface AvailabilityIssue {
  type: 'holiday' | 'room_conflict' | 'teacher_conflict';
  message: string;
  details?: {
    conflictType?: 'class' | 'makeup' | 'trial';
    conflictName?: string;
    conflictTime?: string;
    holidayName?: string;
  };
}

export interface AvailabilityCheckParams {
  date: Date;
  startTime: string;
  endTime: string;
  branchId: string;
  roomId: string;
  teacherId: string;
  excludeId?: string; // For editing existing sessions
  excludeType?: 'class' | 'makeup' | 'trial';
}

/**
 * Comprehensive availability check for scheduling
 */
export async function checkAvailability(
  params: AvailabilityCheckParams
): Promise<AvailabilityCheckResult> {
  const issues: AvailabilityIssue[] = [];
  
  try {
    // 1. Check if it's a holiday
    const holidayCheck = await checkHolidayConflict(params.date, params.branchId);
    if (holidayCheck) {
      issues.push(holidayCheck);
    }
    
    // 2. Check room availability
    const roomIssues = await checkRoomAvailability(params);
    issues.push(...roomIssues);
    
    // 3. Check teacher availability
    const teacherIssues = await checkTeacherAvailability(params);
    issues.push(...teacherIssues);
    
    return {
      available: issues.length === 0,
      reasons: issues
    };
  } catch (error) {
    console.error('Error checking availability:', error);
    return {
      available: false,
      reasons: [{
        type: 'room_conflict',
        message: 'เกิดข้อผิดพลาดในการตรวจสอบ'
      }]
    };
  }
}

/**
 * Check if the date is a holiday
 */
async function checkHolidayConflict(
  date: Date,
  branchId: string
): Promise<AvailabilityIssue | null> {
  const isHolidayDate = await isHoliday(date, branchId);
  
  if (isHolidayDate) {
    // Get holiday details for better message
    const { getHolidaysForBranch } = await import('@/lib/services/holidays');
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const holidays = await getHolidaysForBranch(branchId, startOfDay, endOfDay);
    const holidayName = holidays.length > 0 ? holidays[0].name : 'วันหยุด';
    
    return {
      type: 'holiday',
      message: `วันที่เลือกเป็นวันหยุด (${holidayName})`,
      details: {
        holidayName
      }
    };
  }
  
  return null;
}

/**
 * Check room availability
 */
async function checkRoomAvailability(
  params: AvailabilityCheckParams
): Promise<AvailabilityIssue[]> {
  const issues: AvailabilityIssue[] = [];
  const { date, startTime, endTime, branchId, roomId, excludeId, excludeType } = params;
  
  // 1. Check regular classes on that day
  const dayOfWeek = date.getDay();
  const classes = await getClasses();
  
  // Create date without time for comparison
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  
  // Filter classes for the same branch, room, and day
  const relevantClasses = classes.filter(cls => 
    cls.branchId === branchId &&
    cls.roomId === roomId &&
    cls.daysOfWeek.includes(dayOfWeek) &&
    (cls.status === 'published' || cls.status === 'started') &&
    new Date(cls.startDate) <= dateOnly &&
    new Date(cls.endDate) >= dateOnly &&
    !(excludeType === 'class' && cls.id === excludeId)
  );
  
  // Check time conflicts for each class
  for (const cls of relevantClasses) {
    // Check if the class has a session on this specific date
    const schedulesRef = collection(db, 'classes', cls.id, 'schedules');
    
    // Create start and end of day for query
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const scheduleQuery = query(
      schedulesRef,
      where('sessionDate', '>=', Timestamp.fromDate(startOfDay)),
      where('sessionDate', '<=', Timestamp.fromDate(endOfDay)),
      where('status', '!=', 'cancelled')
    );
    const scheduleSnapshot = await getDocs(scheduleQuery);
    
    if (!scheduleSnapshot.empty) {
      // Check time overlap
      if (startTime < cls.endTime && endTime > cls.startTime) {
        issues.push({
          type: 'room_conflict',
          message: `ห้องไม่ว่าง - มีคลาส ${cls.name} เวลา ${cls.startTime}-${cls.endTime}`,
          details: {
            conflictType: 'class',
            conflictName: cls.name,
            conflictTime: `${cls.startTime}-${cls.endTime}`
          }
        });
      }
    }
  }
  
  // 2. Check makeup classes
  const makeupClasses = await getMakeupClasses();
  
  // Filter makeup classes for the same branch, room, and date
  const relevantMakeups = makeupClasses.filter(makeup => 
    makeup.status === 'scheduled' &&
    makeup.makeupSchedule &&
    makeup.makeupSchedule.branchId === branchId &&
    makeup.makeupSchedule.roomId === roomId &&
    new Date(makeup.makeupSchedule.date).toDateString() === date.toDateString() &&
    !(excludeType === 'makeup' && makeup.id === excludeId)
  );
  
  // Check time conflicts for makeup classes
  for (const makeup of relevantMakeups) {
    if (makeup.makeupSchedule) {
      // Check time overlap
      if (startTime < makeup.makeupSchedule.endTime && endTime > makeup.makeupSchedule.startTime) {
        const { getStudent } = await import('@/lib/services/parents');
        const student = await getStudent(makeup.parentId, makeup.studentId);
        
        issues.push({
          type: 'room_conflict',
          message: `ห้องไม่ว่าง - Makeup Class ของ ${student?.nickname || 'นักเรียน'} เวลา ${makeup.makeupSchedule.startTime}-${makeup.makeupSchedule.endTime}`,
          details: {
            conflictType: 'makeup',
            conflictName: student?.nickname || student?.name || 'Unknown',
            conflictTime: `${makeup.makeupSchedule.startTime}-${makeup.makeupSchedule.endTime}`
          }
        });
      }
    }
  }
  
  // 3. Check trial sessions
  const trialSessions = await getTrialSessions();
  
  // Filter trial sessions
  const relevantTrials = trialSessions.filter(trial =>
    trial.status === 'scheduled' &&
    trial.branchId === branchId &&
    trial.roomId === roomId &&
    new Date(trial.scheduledDate).toDateString() === date.toDateString() &&
    !(excludeType === 'trial' && trial.id === excludeId)
  );
  
  // Check time conflicts for trials
  for (const trial of relevantTrials) {
    // Check time overlap
    if (startTime < trial.endTime && endTime > trial.startTime) {
      issues.push({
        type: 'room_conflict',
        message: `ห้องไม่ว่าง - ทดลองเรียนของ ${trial.studentName} เวลา ${trial.startTime}-${trial.endTime}`,
        details: {
          conflictType: 'trial',
          conflictName: trial.studentName,
          conflictTime: `${trial.startTime}-${trial.endTime}`
        }
      });
    }
  }
  
  return issues;
}

/**
 * Check teacher availability
 */
async function checkTeacherAvailability(
  params: AvailabilityCheckParams
): Promise<AvailabilityIssue[]> {
  const issues: AvailabilityIssue[] = [];
  const { date, startTime, endTime, teacherId, excludeId, excludeType } = params;
  
  // 1. Check regular classes
  const dayOfWeek = date.getDay();
  const classes = await getClasses();
  
  // Create date without time for comparison
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  
  // Filter classes for the same teacher and day
  const teacherClasses = classes.filter(cls => 
    cls.teacherId === teacherId &&
    cls.daysOfWeek.includes(dayOfWeek) &&
    (cls.status === 'published' || cls.status === 'started') &&
    new Date(cls.startDate) <= dateOnly &&
    new Date(cls.endDate) >= dateOnly &&
    !(excludeType === 'class' && cls.id === excludeId)
  );
  
  // Check time conflicts
  for (const cls of teacherClasses) {
    // Check if the class has a session on this specific date
    const schedulesRef = collection(db, 'classes', cls.id, 'schedules');
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const scheduleQuery = query(
      schedulesRef,
      where('sessionDate', '>=', Timestamp.fromDate(startOfDay)),
      where('sessionDate', '<=', Timestamp.fromDate(endOfDay)),
      where('status', '!=', 'cancelled')
    );
    const scheduleSnapshot = await getDocs(scheduleQuery);
    
    if (!scheduleSnapshot.empty) {
      // Check time overlap
      if (startTime < cls.endTime && endTime > cls.startTime) {
        issues.push({
          type: 'teacher_conflict',
          message: `ครูไม่ว่าง - มีคลาส ${cls.name} เวลา ${cls.startTime}-${cls.endTime}`,
          details: {
            conflictType: 'class',
            conflictName: cls.name,
            conflictTime: `${cls.startTime}-${cls.endTime}`
          }
        });
      }
    }
  }
  
  // 2. Check makeup classes
  const makeupClasses = await getMakeupClasses();
  
  // Filter makeup classes for the same teacher and date
  const teacherMakeups = makeupClasses.filter(makeup => 
    makeup.status === 'scheduled' &&
    makeup.makeupSchedule &&
    makeup.makeupSchedule.teacherId === teacherId &&
    new Date(makeup.makeupSchedule.date).toDateString() === date.toDateString() &&
    !(excludeType === 'makeup' && makeup.id === excludeId)
  );
  
  // Check time conflicts
  for (const makeup of teacherMakeups) {
    if (makeup.makeupSchedule) {
      // Check time overlap
      if (startTime < makeup.makeupSchedule.endTime && endTime > makeup.makeupSchedule.startTime) {
        const { getStudent } = await import('@/lib/services/parents');
        const student = await getStudent(makeup.parentId, makeup.studentId);
        
        issues.push({
          type: 'teacher_conflict',
          message: `ครูไม่ว่าง - Makeup Class ของ ${student?.nickname || 'นักเรียน'} เวลา ${makeup.makeupSchedule.startTime}-${makeup.makeupSchedule.endTime}`,
          details: {
            conflictType: 'makeup',
            conflictName: student?.nickname || student?.name || 'Unknown',
            conflictTime: `${makeup.makeupSchedule.startTime}-${makeup.makeupSchedule.endTime}`
          }
        });
      }
    }
  }
  
  // 3. Check trial sessions
  const trialSessions = await getTrialSessions();
  
  // Filter trial sessions
  const teacherTrials = trialSessions.filter(trial =>
    trial.status === 'scheduled' &&
    trial.teacherId === teacherId &&
    new Date(trial.scheduledDate).toDateString() === date.toDateString() &&
    !(excludeType === 'trial' && trial.id === excludeId)
  );
  
  // Check time conflicts
  for (const trial of teacherTrials) {
    // Check time overlap
    if (startTime < trial.endTime && endTime > trial.startTime) {
      issues.push({
        type: 'teacher_conflict',
        message: `ครูไม่ว่าง - ทดลองเรียนของ ${trial.studentName} เวลา ${trial.startTime}-${trial.endTime}`,
        details: {
          conflictType: 'trial',
          conflictName: trial.studentName,
          conflictTime: `${trial.startTime}-${trial.endTime}`
        }
      });
    }
  }
  
  return issues;
}

/**
 * Quick check if a specific time slot is available
 */
export async function isTimeSlotAvailable(
  params: AvailabilityCheckParams
): Promise<boolean> {
  const result = await checkAvailability(params);
  return result.available;
}

/**
 * Get all conflicts for a specific date and branch
 */
export async function getDayConflicts(
  date: Date,
  branchId: string
): Promise<{
  isHoliday: boolean;
  holidayName?: string;
  busySlots: Array<{
    startTime: string;
    endTime: string;
    type: 'class' | 'makeup' | 'trial';
    name: string;
    roomId: string;
    teacherId: string;
  }>;
}> {
  // Check holiday
  const holidayCheck = await checkHolidayConflict(date, branchId);
  
  const busySlots: Array<{
    startTime: string;
    endTime: string;
    type: 'class' | 'makeup' | 'trial';
    name: string;
    roomId: string;
    teacherId: string;
  }> = [];
  
  // Get all classes on that day
  const dayOfWeek = date.getDay();
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  
  const classes = await getClasses();
  const relevantClasses = classes.filter(cls => 
    cls.branchId === branchId &&
    cls.daysOfWeek.includes(dayOfWeek) &&
    (cls.status === 'published' || cls.status === 'started') &&
    new Date(cls.startDate) <= dateOnly &&
    new Date(cls.endDate) >= dateOnly
  );
  
  // Check each class for actual sessions
  for (const cls of relevantClasses) {
    const schedulesRef = collection(db, 'classes', cls.id, 'schedules');
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const scheduleQuery = query(
      schedulesRef,
      where('sessionDate', '>=', Timestamp.fromDate(startOfDay)),
      where('sessionDate', '<=', Timestamp.fromDate(endOfDay)),
      where('status', '!=', 'cancelled')
    );
    const scheduleSnapshot = await getDocs(scheduleQuery);
    
    if (!scheduleSnapshot.empty) {
      busySlots.push({
        startTime: cls.startTime,
        endTime: cls.endTime,
        type: 'class',
        name: cls.name,
        roomId: cls.roomId,
        teacherId: cls.teacherId
      });
    }
  }
  
  // Get makeup classes
  const makeupClasses = await getMakeupClasses();
  const relevantMakeups = makeupClasses.filter(makeup => 
    makeup.status === 'scheduled' &&
    makeup.makeupSchedule &&
    makeup.makeupSchedule.branchId === branchId &&
    new Date(makeup.makeupSchedule.date).toDateString() === date.toDateString()
  );
  
  for (const makeup of relevantMakeups) {
    if (makeup.makeupSchedule) {
      const { getStudent } = await import('@/lib/services/parents');
      const student = await getStudent(makeup.parentId, makeup.studentId);
      
      busySlots.push({
        startTime: makeup.makeupSchedule.startTime,
        endTime: makeup.makeupSchedule.endTime,
        type: 'makeup',
        name: `Makeup: ${student?.nickname || 'นักเรียน'}`,
        roomId: makeup.makeupSchedule.roomId,
        teacherId: makeup.makeupSchedule.teacherId
      });
    }
  }
  
  // Get trial sessions
  const trialSessions = await getTrialSessions();
  const relevantTrials = trialSessions.filter(trial =>
    trial.status === 'scheduled' &&
    trial.branchId === branchId &&
    new Date(trial.scheduledDate).toDateString() === date.toDateString()
  );
  
  for (const trial of relevantTrials) {
    busySlots.push({
      startTime: trial.startTime,
      endTime: trial.endTime,
      type: 'trial',
      name: `ทดลอง: ${trial.studentName}`,
      roomId: trial.roomId,
      teacherId: trial.teacherId
    });
  }
  
  return {
    isHoliday: !!holidayCheck,
    holidayName: holidayCheck?.details?.holidayName,
    busySlots: busySlots.sort((a, b) => a.startTime.localeCompare(b.startTime))
  };
}