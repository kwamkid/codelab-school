// lib/services/dashboard.ts

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { getClasses } from './classes';
import { getSubjects } from './subjects';
import { getTeachers } from './teachers';
import { getBranches } from './branches';
import { getMakeupClasses } from './makeup';
import { getStudentWithParent } from './parents';
import { getTrialSessions } from './trial-bookings';
import { EventInput } from '@fullcalendar/core';

export interface CalendarEvent extends EventInput {
  classId: string;
  extendedProps: {
    type: 'class' | 'makeup' | 'trial'; // Added trial type
    branchId: string;
    branchName: string;
    roomName: string;
    teacherName: string;
    subjectColor?: string; // Add subject color
    enrolled?: number;
    maxStudents?: number;
    sessionNumber?: number;
    status?: string;
    // For makeup
    studentName?: string;
    studentNickname?: string;
    originalClassName?: string;
    makeupStatus?: 'pending' | 'scheduled' | 'completed' | 'cancelled';
    // For trial
    trialStudentName?: string;
    trialSubjectName?: string;
  };
}

export async function getCalendarEvents(
  start: Date, 
  end: Date,
  branchId?: string
): Promise<CalendarEvent[]> {
  try {
    // Get all necessary data
    const [classes, subjects, teachers, branches, makeupClasses, trialSessions] = await Promise.all([
      getClasses(),
      getSubjects(),
      getTeachers(),
      getBranches(),
      getMakeupClasses(),
      getTrialSessions() // Get all trial sessions
    ]);

    // Create lookup maps
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const teacherMap = new Map(teachers.map(t => [t.id, t]));
    const branchMap = new Map(branches.map(b => [b.id, b]));
    const classMap = new Map(classes.map(c => [c.id, c]));

    // Get all rooms data
    const roomsModule = await import('./rooms');
    const allRooms = await Promise.all(
      branches.map(async (branch) => {
        const rooms = await roomsModule.getRoomsByBranch(branch.id);
        return rooms.map(room => ({ ...room, branchId: branch.id }));
      })
    );
    const roomMap = new Map(
      allRooms.flat().map(room => [`${room.branchId}-${room.id}`, room])
    );

    const events: CalendarEvent[] = [];

    // 1. Process regular class schedules
    for (const cls of classes) {
      // Skip if filtering by branch and doesn't match
      if (branchId && cls.branchId !== branchId) continue;
      
      // Skip draft or cancelled classes
      if (cls.status === 'draft' || cls.status === 'cancelled') continue;

      const subject = subjectMap.get(cls.subjectId);
      const teacher = teacherMap.get(cls.teacherId);
      const branch = branchMap.get(cls.branchId);

      if (!subject || !teacher || !branch) continue;

      // Get schedules for this class
      const schedulesRef = collection(db, 'classes', cls.id, 'schedules');
      const scheduleQuery = query(
        schedulesRef,
        where('sessionDate', '>=', Timestamp.fromDate(start)),
        where('sessionDate', '<=', Timestamp.fromDate(end)),
        orderBy('sessionDate', 'asc')
      );

      const scheduleSnapshot = await getDocs(scheduleQuery);
      
      scheduleSnapshot.forEach(doc => {
        const schedule = doc.data();
        const sessionDate = schedule.sessionDate.toDate();
        
        // Skip cancelled schedules
        if (schedule.status === 'cancelled') return;

        // Parse times and create proper date objects
        const [startHour, startMinute] = cls.startTime.split(':').map(Number);
        const [endHour, endMinute] = cls.endTime.split(':').map(Number);
        
        const eventStart = new Date(sessionDate);
        eventStart.setHours(startHour, startMinute, 0, 0);
        
        const eventEnd = new Date(sessionDate);
        eventEnd.setHours(endHour, endMinute, 0, 0);

        // Determine color based on status - using neutral color for regular classes
        let backgroundColor = '#E5E7EB'; // Gray-200 for regular classes
        let borderColor = '#D1D5DB'; // Gray-300 border
        
        if (schedule.status === 'completed') {
          backgroundColor = '#D1FAE5'; // Green-100 for completed
          borderColor = '#A7F3D0'; // Green-200 border
        } else if (schedule.status === 'rescheduled') {
          backgroundColor = '#FEF3C7'; // Amber-100 for rescheduled
          borderColor = '#FDE68A'; // Amber-200 border
        }

        // Get room name
        const room = roomMap.get(`${cls.branchId}-${cls.roomId}`);
        const roomName = room?.name || cls.roomId;

        events.push({
          id: `${cls.id}-${doc.id}`,
          classId: cls.id,
          title: `${subject.name} - ${cls.code}`,
          start: eventStart,
          end: eventEnd,
          backgroundColor,
          borderColor,
          textColor: '#374151', // Gray-700 text
          extendedProps: {
            type: 'class',
            branchId: cls.branchId,
            branchName: branch.name,
            roomName: roomName,
            teacherName: teacher.nickname || teacher.name,
            subjectColor: subject.color, // Add subject color
            enrolled: cls.enrolledCount,
            maxStudents: cls.maxStudents,
            sessionNumber: schedule.sessionNumber,
            status: schedule.status
          }
        });
      });
    }

    // 2. Process makeup classes
    for (const makeup of makeupClasses) {
      // Skip if not scheduled
      if (!makeup.makeupSchedule || makeup.status !== 'scheduled') continue;
      
      // Get class info
      const originalClass = classMap.get(makeup.originalClassId);
      if (!originalClass) continue;
      
      // Skip if filtering by branch and doesn't match
      if (branchId && makeup.makeupSchedule.branchId !== branchId) continue;
      
      // Check if makeup date is within range
      const makeupDate = new Date(makeup.makeupSchedule.date);
      if (makeupDate < start || makeupDate > end) continue;
      
      // Get additional info
      const student = await getStudentWithParent(makeup.studentId);
      const teacher = teacherMap.get(makeup.makeupSchedule.teacherId);
      const branch = branchMap.get(makeup.makeupSchedule.branchId);
      const room = roomMap.get(`${makeup.makeupSchedule.branchId}-${makeup.makeupSchedule.roomId}`);
      const subject = subjectMap.get(originalClass.subjectId);
      
      if (!student || !teacher || !branch) continue;
      
      // Parse times and create proper date objects
      const [startHour, startMinute] = makeup.makeupSchedule.startTime.split(':').map(Number);
      const [endHour, endMinute] = makeup.makeupSchedule.endTime.split(':').map(Number);
      
      const eventStart = new Date(makeupDate);
      eventStart.setHours(startHour, startMinute, 0, 0);
      
      const eventEnd = new Date(makeupDate);
      eventEnd.setHours(endHour, endMinute, 0, 0);
      
      // Purple color for makeup classes
      const backgroundColor = '#E9D5FF'; // Purple-100
      const borderColor = '#D8B4FE'; // Purple-200
      
      events.push({
        id: `makeup-${makeup.id}`,
        classId: makeup.originalClassId,
        title: `[Makeup] ${student.nickname} - ${originalClass.name}`,
        start: eventStart,
        end: eventEnd,
        backgroundColor,
        borderColor,
        textColor: '#6B21A8', // Purple-800 text
        extendedProps: {
          type: 'makeup',
          branchId: makeup.makeupSchedule.branchId,
          branchName: branch.name,
          roomName: room?.name || makeup.makeupSchedule.roomId,
          teacherName: teacher.nickname || teacher.name,
          subjectColor: subject?.color, // Add subject color
          studentName: student.name,
          studentNickname: student.nickname,
          originalClassName: originalClass.name,
          makeupStatus: makeup.status
        }
      });
    }

    // 3. Process trial sessions
    for (const trial of trialSessions) {
      // Skip if not scheduled
      if (trial.status !== 'scheduled') continue;
      
      // Skip if filtering by branch and doesn't match
      if (branchId && trial.branchId !== branchId) continue;
      
      // Check if trial date is within range
      const trialDate = new Date(trial.scheduledDate);
      if (trialDate < start || trialDate > end) continue;
      
      // Get additional info
      const teacher = teacherMap.get(trial.teacherId);
      const branch = branchMap.get(trial.branchId);
      const room = roomMap.get(`${trial.branchId}-${trial.roomId}`);
      const subject = subjectMap.get(trial.subjectId);
      
      if (!teacher || !branch || !subject) continue;
      
      // Parse times and create proper date objects
      const [startHour, startMinute] = trial.startTime.split(':').map(Number);
      const [endHour, endMinute] = trial.endTime.split(':').map(Number);
      
      const eventStart = new Date(trialDate);
      eventStart.setHours(startHour, startMinute, 0, 0);
      
      const eventEnd = new Date(trialDate);
      eventEnd.setHours(endHour, endMinute, 0, 0);
      
      // Orange color for trial classes
      const backgroundColor = '#FED7AA'; // Orange-200
      const borderColor = '#FDBA74'; // Orange-300
      
      events.push({
        id: `trial-${trial.id}`,
        classId: '', // No class ID for trials
        title: `${trial.studentName} - ${subject.name}`,
        start: eventStart,
        end: eventEnd,
        backgroundColor,
        borderColor,
        textColor: '#9A3412', // Orange-900 text
        extendedProps: {
          type: 'trial',
          branchId: trial.branchId,
          branchName: branch.name,
          roomName: room?.name || trial.roomName || trial.roomId,
          teacherName: teacher.nickname || teacher.name,
          subjectColor: subject.color, // Add subject color
          trialStudentName: trial.studentName,
          trialSubjectName: subject.name
        }
      });
    }

    return events.sort((a, b) => {
      const dateA = a.start as Date;
      const dateB = b.start as Date;
      return dateA.getTime() - dateB.getTime();
    });
  } catch (error) {
    console.error('Error getting calendar events:', error);
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
  upcomingTrials: number; // Add trial stats
}

export async function getDashboardStats(branchId?: string): Promise<DashboardStats> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all data
    const [classes, makeupClasses, trialSessions] = await Promise.all([
      getClasses(),
      getMakeupClasses(),
      getTrialSessions()
    ]);

    // Filter by branch if specified
    const filteredClasses = branchId 
      ? classes.filter(c => c.branchId === branchId)
      : classes;

    // Calculate stats
    const activeClasses = filteredClasses.filter(c => 
      c.status === 'published' || c.status === 'started'
    );

    // Get today's classes
    const todayEvents = await getCalendarEvents(today, tomorrow, branchId);
    const todayClassCount = todayEvents.filter(e => e.extendedProps.type === 'class').length;

    // Calculate student count
    const totalStudents = activeClasses.reduce((sum, cls) => sum + cls.enrolledCount, 0);

    // Filter makeups by branch if specified
    const filteredMakeups = branchId
      ? makeupClasses.filter(m => 
          m.makeupSchedule?.branchId === branchId || 
          (m.status === 'pending' && classes.find(c => c.id === m.originalClassId)?.branchId === branchId)
        )
      : makeupClasses;

    // Count upcoming and pending makeups
    const upcomingMakeups = filteredMakeups.filter(m => 
      m.status === 'scheduled' && 
      m.makeupSchedule && 
      new Date(m.makeupSchedule.date) >= today
    ).length;

    const pendingMakeups = filteredMakeups.filter(m => 
      m.status === 'pending'
    ).length;

    // Count upcoming trials
    const upcomingTrials = trialSessions.filter(t => 
      t.status === 'scheduled' && 
      new Date(t.scheduledDate) >= today &&
      (!branchId || t.branchId === branchId)
    ).length;

    return {
      totalStudents,
      totalClasses: filteredClasses.length,
      activeClasses: activeClasses.length,
      todayClasses: todayClassCount,
      upcomingMakeups,
      pendingMakeups,
      upcomingTrials
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