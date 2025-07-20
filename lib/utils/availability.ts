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
import { getSubjects } from '@/lib/services/subjects';

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
  
  // 3. SKIP trial sessions checking - อนุญาตให้นัดทดลองเรียนหลายคนในเวลาเดียวกันได้
  // ไม่นับ trial sessions เป็น conflict เพื่อให้สามารถนัดหลายคนในช่วงเวลาเดียวกันได้
  
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
  
  // 3. SKIP trial sessions checking - อนุญาตให้ครูสอนทดลองเรียนหลายคนพร้อมกันได้
  // ไม่นับ trial sessions เป็น conflict สำหรับครู เพื่อให้ครูสามารถสอนทดลองเรียนได้หลายคนในเวลาเดียวกัน
  
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
    roomName?: string;
    teacherId: string;
    teacherName?: string;
    subjectId?: string;
    studentName?: string;
    subjectName?: string;
    trialCount?: number;
    trialDetails?: Array<{
      id: string;
      studentName: string;
      subjectId: string;
      subjectName: string;
      status: string;
      attended?: boolean;
    }>;
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
    roomName?: string;
    teacherId: string;
    teacherName?: string;
    subjectId?: string;
    studentName?: string;
    subjectName?: string;
    trialCount?: number;
    trialDetails?: Array<{
      id: string;
      studentName: string;
      subjectId: string;
      subjectName: string;
      status: string;
      attended?: boolean;
    }>;
  }> = [];
  
  // Get all necessary data
  const [classes, makeupClasses, trialSessions, subjects] = await Promise.all([
    getClasses(),
    getMakeupClasses(), 
    getTrialSessions(),
    getSubjects()
  ]);
  
  // Get teachers and rooms
  const { getTeachers } = await import('@/lib/services/teachers');
  const { getRoomsByBranch } = await import('@/lib/services/rooms');
  const [teachers, rooms] = await Promise.all([
    getTeachers(),
    getRoomsByBranch(branchId)
  ]);
  
  // Create lookup maps
  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const roomMap = new Map(rooms.map(r => [r.id, r]));
  
  // Get all classes on that day
  const dayOfWeek = date.getDay();
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  
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
      const teacher = teacherMap.get(cls.teacherId);
      const room = roomMap.get(cls.roomId);
      const subject = subjects.find(s => s.id === cls.subjectId);
      
      busySlots.push({
        startTime: cls.startTime,
        endTime: cls.endTime,
        type: 'class',
        name: cls.name,
        roomId: cls.roomId,
        roomName: room?.name || cls.roomId,
        teacherId: cls.teacherId,
        teacherName: teacher?.nickname || teacher?.name || 'ไม่ระบุครู',
        subjectId: cls.subjectId,
        subjectName: subject?.name
      });
    }
  }
  
  // Get makeup classes
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
      const teacher = teacherMap.get(makeup.makeupSchedule.teacherId);
      const room = roomMap.get(makeup.makeupSchedule.roomId);
      const originalClass = classes.find(c => c.id === makeup.originalClassId);
      const subject = originalClass ? subjects.find(s => s.id === originalClass.subjectId) : null;
      
      busySlots.push({
        startTime: makeup.makeupSchedule.startTime,
        endTime: makeup.makeupSchedule.endTime,
        type: 'makeup',
        name: `Makeup: ${student?.nickname || 'นักเรียน'}`,
        roomId: makeup.makeupSchedule.roomId,
        roomName: room?.name || makeup.makeupSchedule.roomId,
        teacherId: makeup.makeupSchedule.teacherId,
        teacherName: teacher?.nickname || teacher?.name || 'ไม่ระบุครู',
        studentName: student?.nickname || student?.name || 'นักเรียน',
        subjectId: originalClass?.subjectId,
        subjectName: subject?.name
      });
    }
  }
  
  // Get trial sessions and GROUP them
  const relevantTrials = trialSessions.filter(trial =>
    trial.status === 'scheduled' &&
    trial.branchId === branchId &&
    new Date(trial.scheduledDate).toDateString() === date.toDateString()
  );
  
  // Group trials by time slot and room
  const trialGroups = new Map<string, typeof relevantTrials>();
  
  for (const trial of relevantTrials) {
    const key = `${trial.startTime}-${trial.endTime}-${trial.roomId}-${trial.teacherId}`;
    
    if (!trialGroups.has(key)) {
      trialGroups.set(key, []);
    }
    
    trialGroups.get(key)!.push(trial);
  }
  
  // Process each group
  for (const [key, trials] of trialGroups) {
    const firstTrial = trials[0];
    const teacher = teacherMap.get(firstTrial.teacherId);
    const room = roomMap.get(firstTrial.roomId);
    
    // สร้างชื่อที่รวมนักเรียนทั้งหมด
    const studentNames = trials.map(t => t.studentName).join(', ');
    
    // รวบรวมวิชาที่ไม่ซ้ำกัน
    const uniqueSubjects = [...new Set(trials.map(t => {
      const subject = subjects.find(s => s.id === t.subjectId);
      return subject?.name || 'ไม่ระบุวิชา';
    }))];
    
    // สร้างรายละเอียดของแต่ละคน
    const trialDetails = trials.map(trial => {
      const subject = subjects.find(s => s.id === trial.subjectId);
      return {
        id: trial.id,
        studentName: trial.studentName,
        subjectId: trial.subjectId,
        subjectName: subject?.name || 'ไม่ระบุวิชา',
        status: trial.status,
        attended: trial.attended
      };
    });
    
    busySlots.push({
      startTime: firstTrial.startTime,
      endTime: firstTrial.endTime,
      type: 'trial',
      name: trials.length === 1 
        ? `ทดลอง: ${studentNames}` 
        : `ทดลอง ${trials.length} คน: ${studentNames}`,
      roomId: firstTrial.roomId,
      roomName: room?.name || firstTrial.roomName || firstTrial.roomId,
      teacherId: firstTrial.teacherId,
      teacherName: teacher?.nickname || teacher?.name || 'ไม่ระบุครู',
      studentName: studentNames,
      subjectName: uniqueSubjects.join(', '),
      trialCount: trials.length,
      trialDetails: trialDetails
    });
  }
  
  return {
    isHoliday: !!holidayCheck,
    holidayName: holidayCheck?.details?.holidayName,
    busySlots: busySlots.sort((a, b) => a.startTime.localeCompare(b.startTime))
  };
}