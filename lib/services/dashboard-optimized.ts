// lib/services/dashboard-optimized.ts

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  orderBy,
  documentId
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { EventInput } from '@fullcalendar/core';

export interface CalendarEvent extends EventInput {
  classId: string;
  extendedProps: {
    type: 'class' | 'makeup' | 'trial' | 'holiday';
    branchId: string;
    branchName: string;
    roomName: string;
    teacherName: string;
    subjectColor?: string;
    enrolled?: number;
    maxStudents?: number;
    sessionNumber?: number;
    status?: string;
    isFullyAttended?: boolean;
    startTime?: string;
    endTime?: string;
    attendance?: any[];
    // For makeup
    studentName?: string;
    studentNickname?: string;
    originalClassName?: string;
    makeupStatus?: 'pending' | 'scheduled' | 'completed' | 'cancelled';
    // For trial
    trialStudentName?: string;
    trialSubjectName?: string;
    trialCount?: number; // จำนวนนักเรียนทดลองใน slot เดียวกัน
    trialDetails?: Array<{ // รายละเอียดของแต่ละคน
      id: string;
      studentName: string;
      subjectId: string;
      subjectName: string;
      status: string;
      attended?: boolean;
      interestedLevel?: string;
      feedback?: string;
    }>;
    // For holiday
    holidayType?: 'national' | 'branch';
  };
}

// Cache for static data
let staticDataCache: {
  subjects: Map<string, any>;
  teachers: Map<string, any>;
  branches: Map<string, any>;
  rooms: Map<string, any>;
  lastFetch: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getStaticData() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (staticDataCache && (now - staticDataCache.lastFetch) < CACHE_DURATION) {
    return staticDataCache;
  }

  // Fetch fresh data
  const [subjectsSnapshot, teachersSnapshot, branchesSnapshot] = await Promise.all([
    getDocs(collection(db, 'subjects')),
    getDocs(collection(db, 'teachers')),
    getDocs(collection(db, 'branches'))
  ]);

  const subjects = new Map(
    subjectsSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }])
  );
  
  const teachers = new Map(
    teachersSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }])
  );
  
  const branches = new Map(
    branchesSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }])
  );

  // Get all rooms for all branches
  const roomsMap = new Map();
  for (const branch of branches.values()) {
    const roomsSnapshot = await getDocs(
      collection(db, 'branches', branch.id, 'rooms')
    );
    roomsSnapshot.docs.forEach(doc => {
      roomsMap.set(`${branch.id}-${doc.id}`, { id: doc.id, ...doc.data() });
    });
  }

  staticDataCache = {
    subjects,
    teachers,
    branches,
    rooms: roomsMap,
    lastFetch: now
  };

  return staticDataCache;
}

export async function getOptimizedCalendarEvents(
  start: Date, 
  end: Date,
  branchId?: string
): Promise<CalendarEvent[]> {
  try {
    // Get static data (cached)
    const { subjects, teachers, branches, rooms } = await getStaticData();
    
    const events: CalendarEvent[] = [];
    const now = new Date();

    // 1. Get holidays in range
    const holidaysQuery = query(
      collection(db, 'holidays'),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end))
    );
    
    const holidaysSnapshot = await getDocs(holidaysQuery);
    
    // Process holidays
    holidaysSnapshot.docs.forEach(doc => {
      const holiday = { id: doc.id, ...doc.data() };
      
      // Filter by branch if needed
      if (branchId && holiday.type === 'branch' && !holiday.branches?.includes(branchId)) {
        return;
      }

      const holidayDate = holiday.date.toDate();
      holidayDate.setHours(0, 0, 0, 0);
      
      const holidayEndDate = new Date(holidayDate);
      holidayEndDate.setHours(23, 59, 59, 999);

      events.push({
        id: `holiday-${holiday.id}`,
        classId: '',
        title: holiday.name,
        start: holidayDate,
        end: holidayEndDate,
        allDay: true,
        backgroundColor: '#EF4444',
        borderColor: '#DC2626',
        textColor: '#FFFFFF',
        display: 'background',
        extendedProps: {
          type: 'holiday',
          branchId: branchId || 'all',
          branchName: holiday.type === 'national' ? 'ทุกสาขา' : 'เฉพาะสาขา',
          roomName: '',
          teacherName: '',
          holidayType: holiday.type
        }
      });
    });

    // 2. Get class schedules in date range
    let classesQuery = query(
      collection(db, 'classes'),
      where('status', 'in', ['published', 'started', 'completed'])
    );
    
    if (branchId) {
      classesQuery = query(classesQuery, where('branchId', '==', branchId));
    }
    
    const classesSnapshot = await getDocs(classesQuery);
    
    // Process each class and get its schedules
    const schedulePromises = classesSnapshot.docs.map(async (classDoc) => {
      const classData = { id: classDoc.id, ...classDoc.data() };
      
      // Get schedules for this class in date range
      const schedulesQuery = query(
        collection(db, 'classes', classDoc.id, 'schedules'),
        where('sessionDate', '>=', Timestamp.fromDate(start)),
        where('sessionDate', '<=', Timestamp.fromDate(end)),
        where('status', '!=', 'cancelled'),
        orderBy('sessionDate', 'asc')
      );
      
      const schedulesSnapshot = await getDocs(schedulesQuery);
      
      return schedulesSnapshot.docs.map(scheduleDoc => ({
        id: scheduleDoc.id,
        classId: classDoc.id,
        classData,
        scheduleData: scheduleDoc.data()
      }));
    });
    
    const allSchedules = (await Promise.all(schedulePromises)).flat();
    
    // Process schedules into events
    allSchedules.forEach(({ id, classId, classData, scheduleData }) => {
      const subject = subjects.get(classData.subjectId);
      const teacher = teachers.get(classData.teacherId);
      const branch = branches.get(classData.branchId);
      const room = rooms.get(`${classData.branchId}-${classData.roomId}`);
      
      if (!subject || !teacher || !branch) return;
      
      const sessionDate = scheduleData.sessionDate.toDate();
      const [startHour, startMinute] = classData.startTime.split(':').map(Number);
      const [endHour, endMinute] = classData.endTime.split(':').map(Number);
      
      const eventStart = new Date(sessionDate);
      eventStart.setHours(startHour, startMinute, 0, 0);
      
      const eventEnd = new Date(sessionDate);
      eventEnd.setHours(endHour, endMinute, 0, 0);
      
      // Check attendance status
      const hasAttendance = scheduleData.attendance && scheduleData.attendance.length > 0;
      const isFullyAttended = hasAttendance && classData.enrolledCount > 0 &&
        scheduleData.attendance.length >= classData.enrolledCount;
      
      // Determine color and status
      let backgroundColor = '#E5E7EB';
      let borderColor = '#D1D5DB';
      let effectiveStatus = scheduleData.status;
      
      if (isFullyAttended) {
        backgroundColor = '#D1FAE5';
        borderColor = '#A7F3D0';
        effectiveStatus = 'completed';
      } else if (eventEnd < now) {
        backgroundColor = '#FEF3C7';
        borderColor = '#FDE68A';
        effectiveStatus = 'past_incomplete';
      }
      
      events.push({
        id: `${classId}-${id}`,
        classId: classId,
        title: `${subject.name} - ${classData.code}`,
        start: eventStart,
        end: eventEnd,
        backgroundColor,
        borderColor,
        textColor: effectiveStatus === 'completed' ? '#065F46' : 
                   effectiveStatus === 'past_incomplete' ? '#92400E' : '#374151',
        extendedProps: {
          type: 'class',
          branchId: classData.branchId,
          branchName: branch.name,
          roomName: room?.name || classData.roomId,
          teacherName: teacher.nickname || teacher.name,
          subjectColor: subject.color,
          enrolled: classData.enrolledCount,
          maxStudents: classData.maxStudents,
          sessionNumber: scheduleData.sessionNumber,
          status: effectiveStatus,
          isFullyAttended,
          startTime: classData.startTime,
          endTime: classData.endTime,
          attendance: scheduleData.attendance
        }
      });
    });

    // 3. Get makeup classes in range
    let makeupQuery = query(
      collection(db, 'makeupClasses'),
      where('status', 'in', ['scheduled', 'completed']),
      where('makeupSchedule.date', '>=', Timestamp.fromDate(start)),
      where('makeupSchedule.date', '<=', Timestamp.fromDate(end))
    );
    
    if (branchId) {
      makeupQuery = query(makeupQuery, where('makeupSchedule.branchId', '==', branchId));
    }
    
    const makeupSnapshot = await getDocs(makeupQuery);
    
    // Get unique class IDs and student IDs for batch fetching
    const classIds = new Set<string>();
    const studentIds = new Set<string>();
    
    makeupSnapshot.docs.forEach(doc => {
      const data = doc.data();
      classIds.add(data.originalClassId);
      studentIds.add(data.studentId);
    });
    
    // Batch get class info
    const classInfoMap = new Map();
    if (classIds.size > 0) {
      for (const classId of classIds) {
        const classDoc = classesSnapshot.docs.find(doc => doc.id === classId);
        if (classDoc) {
          classInfoMap.set(classId, { id: classDoc.id, ...classDoc.data() });
        }
      }
    }
    
    // Process makeup events
    for (const doc of makeupSnapshot.docs) {
      const makeup = { id: doc.id, ...doc.data() };
      const originalClass = classInfoMap.get(makeup.originalClassId);
      
      if (!originalClass || !makeup.makeupSchedule) continue;
      
      const teacher = teachers.get(makeup.makeupSchedule.teacherId);
      const branch = branches.get(makeup.makeupSchedule.branchId);
      const room = rooms.get(`${makeup.makeupSchedule.branchId}-${makeup.makeupSchedule.roomId}`);
      const subject = subjects.get(originalClass.subjectId);
      
      if (!teacher || !branch) continue;
      
      const makeupDate = makeup.makeupSchedule.date.toDate();
      const [startHour, startMinute] = makeup.makeupSchedule.startTime.split(':').map(Number);
      const [endHour, endMinute] = makeup.makeupSchedule.endTime.split(':').map(Number);
      
      const eventStart = new Date(makeupDate);
      eventStart.setHours(startHour, startMinute, 0, 0);
      
      const eventEnd = new Date(makeupDate);
      eventEnd.setHours(endHour, endMinute, 0, 0);
      
      let backgroundColor = '#E9D5FF';
      let borderColor = '#D8B4FE';
      let textColor = '#6B21A8';
      
      if (eventEnd < now || makeup.attendance || makeup.status === 'completed') {
        backgroundColor = '#D1FAE5';
        borderColor = '#A7F3D0';
        textColor = '#065F46';
      }
      
      events.push({
        id: `makeup-${makeup.id}`,
        classId: makeup.originalClassId,
        title: `[Makeup] ${makeup.studentNickname || 'นักเรียน'} - ${originalClass.name}`,
        start: eventStart,
        end: eventEnd,
        backgroundColor,
        borderColor,
        textColor,
        extendedProps: {
          type: 'makeup',
          branchId: makeup.makeupSchedule.branchId,
          branchName: branch.name,
          roomName: room?.name || makeup.makeupSchedule.roomId,
          teacherName: teacher.nickname || teacher.name,
          subjectColor: subject?.color,
          studentName: makeup.studentName || '',
          studentNickname: makeup.studentNickname || '',
          originalClassName: originalClass.name,
          makeupStatus: makeup.status
        }
      });
    }

    // 4. Get trial sessions in range - GROUP BY TIME SLOT
    let trialQuery = query(
      collection(db, 'trialSessions'),
      where('scheduledDate', '>=', Timestamp.fromDate(start)),
      where('scheduledDate', '<=', Timestamp.fromDate(end)),
      where('status', '!=', 'cancelled')
    );
    
    if (branchId) {
      trialQuery = query(trialQuery, where('branchId', '==', branchId));
    }
    
    const trialSnapshot = await getDocs(trialQuery);
    
    // Group trials by time slot, room, and teacher
    const trialGroups = new Map<string, any[]>();
    
    trialSnapshot.docs.forEach(doc => {
      const trial = { id: doc.id, ...doc.data() };
      
      // Create unique key for grouping (same date, time, room, and teacher)
      const trialDate = trial.scheduledDate.toDate();
      const dateKey = trialDate.toISOString().split('T')[0];
      const key = `${trial.branchId}-${trial.roomId}-${dateKey}-${trial.startTime}-${trial.endTime}-${trial.teacherId}`;
      
      if (!trialGroups.has(key)) {
        trialGroups.set(key, []);
      }
      
      trialGroups.get(key)!.push(trial);
    });
    
    // Process each group of trials
    for (const [key, groupedTrials] of trialGroups) {
      if (groupedTrials.length === 0) continue;
      
      const firstTrial = groupedTrials[0];
      const teacher = teachers.get(firstTrial.teacherId);
      const branch = branches.get(firstTrial.branchId);
      const room = rooms.get(`${firstTrial.branchId}-${firstTrial.roomId}`);
      
      if (!teacher || !branch) continue;
      
      const trialDate = firstTrial.scheduledDate.toDate();
      const [startHour, startMinute] = firstTrial.startTime.split(':').map(Number);
      const [endHour, endMinute] = firstTrial.endTime.split(':').map(Number);
      
      const eventStart = new Date(trialDate);
      eventStart.setHours(startHour, startMinute, 0, 0);
      
      const eventEnd = new Date(trialDate);
      eventEnd.setHours(endHour, endMinute, 0, 0);
      
      // Determine color based on time and attendance
      let backgroundColor = '#FED7AA'; // Orange-200 default
      let borderColor = '#FDBA74'; // Orange-300 default
      let textColor = '#9A3412'; // Orange-900 default
      
      // Check if all trials have been completed
      const allCompleted = groupedTrials.every(trial => 
        eventEnd < now || trial.attended || trial.status === 'attended' || trial.status === 'absent'
      );
      
      if (allCompleted) {
        backgroundColor = '#D1FAE5'; // Green-100 for completed
        borderColor = '#A7F3D0'; // Green-200 border
        textColor = '#065F46'; // Green-800 text
      }
      
      // Create student info array with subject names
      const studentInfo = groupedTrials.map(trial => {
        const subject = subjects.get(trial.subjectId);
        return `${trial.studentName} (${subject?.name || 'ไม่ระบุวิชา'})`;
      });
      
      // Create title based on number of students
      const title = groupedTrials.length === 1 
        ? `ทดลอง: ${studentInfo[0]}`
        : `ทดลอง ${groupedTrials.length} คน: ${groupedTrials.map(t => t.studentName).join(', ')}`;
      
      // Get unique subjects
      const uniqueSubjects = [...new Set(groupedTrials.map(t => {
        const subject = subjects.get(t.subjectId);
        return subject?.name || 'ไม่ระบุวิชา';
      }))];
      
      // Create trial details for extended props
      const trialDetails = groupedTrials.map(trial => {
        const subject = subjects.get(trial.subjectId);
        return {
          id: trial.id,
          studentName: trial.studentName,
          subjectId: trial.subjectId,
          subjectName: subject?.name || 'ไม่ระบุวิชา',
          status: trial.status,
          attended: trial.attended,
          interestedLevel: trial.interestedLevel,
          feedback: trial.feedback
        };
      });
      
      events.push({
        id: `trial-group-${key}`,
        classId: '', // No class ID for trials
        title,
        start: eventStart,
        end: eventEnd,
        backgroundColor,
        borderColor,
        textColor,
        extendedProps: {
          type: 'trial',
          branchId: firstTrial.branchId,
          branchName: branch.name,
          roomName: room?.name || firstTrial.roomName || firstTrial.roomId,
          teacherName: teacher.nickname || teacher.name,
          subjectColor: '#F97316', // Orange color for trials
          trialStudentName: studentInfo.join(', '),
          trialSubjectName: uniqueSubjects.join(', '),
          trialCount: groupedTrials.length,
          trialDetails: trialDetails
        }
      });
    }

    // Sort events by start time
    return events.sort((a, b) => {
      const dateA = a.start as Date;
      const dateB = b.start as Date;
      return dateA.getTime() - dateB.getTime();
    });
    
  } catch (error) {
    console.error('Error getting optimized calendar events:', error);
    return [];
  }
}

// Get dashboard statistics
export interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  activeClasses: number;
  todayClasses: number;
  upcomingMakeups: number;
  pendingMakeups: number;
  upcomingTrials: number;
}

export async function getOptimizedDashboardStats(branchId?: string): Promise<DashboardStats> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get only active classes
    let classQuery = query(
      collection(db, 'classes'),
      where('status', 'in', ['published', 'started'])
    );
    
    if (branchId) {
      classQuery = query(classQuery, where('branchId', '==', branchId));
    }
    
    const classSnapshot = await getDocs(classQuery);
    
    // Calculate student count from enrolledCount
    let totalStudents = 0;
    classSnapshot.docs.forEach(doc => {
      const data = doc.data();
      totalStudents += data.enrolledCount || 0;
    });

    // Get today's events count
    const todayEvents = await getOptimizedCalendarEvents(today, tomorrow, branchId);
    const todayClassCount = todayEvents.filter(e => e.extendedProps.type === 'class').length;

    // Get makeup stats
    const makeupQuery = query(
      collection(db, 'makeupClasses'),
      where('status', 'in', ['pending', 'scheduled'])
    );
    
    const makeupSnapshot = await getDocs(makeupQuery);
    
    let upcomingMakeups = 0;
    let pendingMakeups = 0;
    
    makeupSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Filter by branch if needed
      if (branchId) {
        const classId = data.originalClassId;
        const classDoc = classSnapshot.docs.find(d => d.id === classId);
        if (!classDoc || classDoc.data().branchId !== branchId) return;
      }
      
      if (data.status === 'pending') {
        pendingMakeups++;
      } else if (data.status === 'scheduled' && data.makeupSchedule) {
        const makeupDate = data.makeupSchedule.date.toDate();
        if (makeupDate >= today) {
          upcomingMakeups++;
        }
      }
    });

    // Get trial stats
    let trialQuery = query(
      collection(db, 'trialSessions'),
      where('status', '==', 'scheduled'),
      where('scheduledDate', '>=', Timestamp.fromDate(today))
    );
    
    if (branchId) {
      trialQuery = query(trialQuery, where('branchId', '==', branchId));
    }
    
    const trialSnapshot = await getDocs(trialQuery);

    return {
      totalStudents,
      totalClasses: classSnapshot.size,
      activeClasses: classSnapshot.size,
      todayClasses: todayClassCount,
      upcomingMakeups,
      pendingMakeups,
      upcomingTrials: trialSnapshot.size
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return {
      totalStudents: 0,
      totalClasses: 0,
      activeClasses: 0,
      todayClasses: 0,
      upcomingMakeups: 0,
      pendingMakeups: 0,
      upcomingTrials: 0
    };
  }
}

// Clear cache when needed
export function clearDashboardCache() {
  staticDataCache = null;
}