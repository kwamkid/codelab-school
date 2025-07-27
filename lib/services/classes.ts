// lib/services/classes.ts

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch,
  DocumentData,
  deleteDoc,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Class, ClassSchedule, Room } from '@/types/models';
import { getRoomsByBranch } from './rooms';
import { getHolidaysForBranch } from './holidays';

const COLLECTION_NAME = 'classes';

// Get all classes
export async function getClasses(branchId?: string, teacherId?: string): Promise<Class[]> {
  try {
    let constraints: any[] = [orderBy('createdAt', 'desc')];
    
    // Add branch filter if provided
    if (branchId) {
      constraints.unshift(where('branchId', '==', branchId));
    }
    
    // Add teacher filter if provided
    if (teacherId) {
      constraints.unshift(where('teacherId', '==', teacherId));
    }
    
    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate() || new Date(),
      endDate: doc.data().endDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as Class));
  } catch (error) {
    console.error('Error getting classes:', error);
    throw error;
  }
}

// Get single class
export async function getClass(id: string): Promise<Class | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        startDate: docSnap.data().startDate?.toDate() || new Date(),
        endDate: docSnap.data().endDate?.toDate() || new Date(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      } as Class;
    }
    return null;
  } catch (error) {
    console.error('Error getting class:', error);
    throw error;
  }
}

// Get classes by subject
export async function getClassesBySubject(subjectId: string): Promise<Class[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('subjectId', '==', subjectId),
      orderBy('startDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate() || new Date(),
      endDate: doc.data().endDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as Class));
  } catch (error) {
    console.error('Error getting classes by subject:', error);
    return [];
  }
}

// Get classes by teacher
export async function getClassesByTeacher(teacherId: string): Promise<Class[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('teacherId', '==', teacherId),
      orderBy('startDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate() || new Date(),
      endDate: doc.data().endDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as Class));
  } catch (error) {
    console.error('Error getting classes by teacher:', error);
    return [];
  }
}

// Get classes by branch
export async function getClassesByBranch(branchId: string): Promise<Class[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('branchId', '==', branchId),
      orderBy('startDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate() || new Date(),
      endDate: doc.data().endDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as Class));
  } catch (error) {
    console.error('Error getting classes by branch:', error);
    return [];
  }
}

// Create new class with schedules (FIXED - now gets holidays internally)
export async function createClass(
  classData: Omit<Class, 'id' | 'createdAt' | 'enrolledCount'>
): Promise<string> {
  try {
    // Validate status
    const validStatuses = ['draft', 'published', 'started', 'completed', 'cancelled'];
    if (!classData.status || !validStatuses.includes(classData.status)) {
      // Default to 'draft' if status is invalid or empty
      console.warn('Invalid or empty status provided, defaulting to "draft"');
      classData.status = 'draft';
    }
    
    // Get holidays for the branch
    const maxEndDate = new Date(classData.startDate);
    maxEndDate.setMonth(maxEndDate.getMonth() + 6); // Look ahead 6 months
    
    const holidays = await getHolidaysForBranch(
      classData.branchId,
      classData.startDate,
      maxEndDate
    );
    
    // Convert holidays to Date array
    const holidayDates = holidays.map(h => h.date);
    
    // Add class document with validated status
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...classData,
      status: classData.status || 'draft', // Ensure status is never empty
      startDate: Timestamp.fromDate(classData.startDate),
      endDate: Timestamp.fromDate(classData.endDate),
      enrolledCount: 0,
      createdAt: serverTimestamp(),
    });

    // Generate schedules with holidays
    const schedules = generateSchedules(
      classData.startDate,
      classData.endDate,
      classData.daysOfWeek,
      classData.totalSessions,
      holidayDates
    );

    // Add schedules as subcollection
    const batch = writeBatch(db);
    schedules.forEach((schedule, index) => {
      const scheduleRef = doc(collection(db, COLLECTION_NAME, docRef.id, 'schedules'));
      batch.set(scheduleRef, {
        sessionDate: Timestamp.fromDate(schedule),
        sessionNumber: index + 1,
        status: 'scheduled',
      });
    });

    await batch.commit();
    return docRef.id;
  } catch (error) {
    console.error('Error creating class:', error);
    throw error;
  }
}

// Update class
export async function updateClass(
  id: string,
  classData: Partial<Class>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // Convert dates to Timestamps
    const updateData: Partial<DocumentData> = { ...classData };
    if (classData.startDate) {
      updateData.startDate = Timestamp.fromDate(classData.startDate);
    }
    if (classData.endDate) {
      updateData.endDate = Timestamp.fromDate(classData.endDate);
    }
    
    // Validate status if provided
    if (classData.status) {
      const validStatuses = ['draft', 'published', 'started', 'completed', 'cancelled'];
      if (!validStatuses.includes(classData.status)) {
        throw new Error(`Invalid status: ${classData.status}`);
      }
    }
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating class:', error);
    throw error;
  }
}

// Delete class
export async function deleteClass(id: string): Promise<void> {
  try {
    // First, check if there are enrolled students
    const classDoc = await getClass(id);
    if (classDoc && classDoc.enrolledCount > 0) {
      throw new Error('Cannot delete class with enrolled students');
    }

    // Delete all schedules
    const schedulesRef = collection(db, COLLECTION_NAME, id, 'schedules');
    const schedulesSnapshot = await getDocs(schedulesRef);
    
    const batch = writeBatch(db);
    schedulesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the class
    const classRef = doc(db, COLLECTION_NAME, id);
    batch.delete(classRef);
    
    await batch.commit();
  } catch (error) {
    console.error('Error deleting class:', error);
    throw error;
  }
}

// Get class schedules
export async function getClassSchedules(classId: string): Promise<ClassSchedule[]> {
  try {
    const schedulesRef = collection(db, COLLECTION_NAME, classId, 'schedules');
    const q = query(schedulesRef, orderBy('sessionDate', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      classId,
      ...doc.data(),
      sessionDate: doc.data().sessionDate?.toDate() || new Date(),
      originalDate: doc.data().originalDate?.toDate(),
      rescheduledAt: doc.data().rescheduledAt?.toDate(),
    } as ClassSchedule));
  } catch (error) {
    console.error('Error getting class schedules:', error);
    return [];
  }
}

// Get single class schedule
export async function getClassSchedule(
  classId: string,
  scheduleId: string
): Promise<ClassSchedule | null> {
  try {
    const scheduleRef = doc(db, COLLECTION_NAME, classId, 'schedules', scheduleId);
    const scheduleDoc = await getDoc(scheduleRef);
    
    if (!scheduleDoc.exists()) {
      return null;
    }
    
    const data = scheduleDoc.data();
    return {
      id: scheduleDoc.id,
      classId,
      ...data,
      sessionDate: data.sessionDate?.toDate() || new Date(),
      originalDate: data.originalDate?.toDate(),
      rescheduledAt: data.rescheduledAt?.toDate(),
    } as ClassSchedule;
  } catch (error) {
    console.error('Error getting class schedule:', error);
    return null;
  }
}

// Update class schedule - FIXED VERSION with better attendance handling
export async function updateClassSchedule(
  classId: string,
  scheduleId: string,
  data: Partial<ClassSchedule>
): Promise<void> {
  try {
    const scheduleRef = doc(db, COLLECTION_NAME, classId, 'schedules', scheduleId);
    
    // Get current schedule data
    const scheduleDoc = await getDoc(scheduleRef);
    if (!scheduleDoc.exists()) {
      throw new Error('Schedule not found');
    }
    
    const currentData = scheduleDoc.data();
    
    // Prepare update data
    const updateData: any = { ...data };
    
    // Handle attendance updates
    if (data.attendance !== undefined) {
      // Add metadata to each attendance record
      updateData.attendance = data.attendance.map((att: any) => ({
        studentId: att.studentId,
        status: att.status,
        note: att.note || '',
        checkedAt: att.checkedAt || new Date(),
        checkedBy: att.checkedBy || 'system'
      }));
      
      // Set status based on attendance
      if (data.attendance.length > 0) {
        updateData.status = 'completed';
      } else {
        updateData.status = 'scheduled';
      }
      
      // Log for debugging
      console.log(`Updating attendance for schedule ${scheduleId}:`, {
        studentCount: data.attendance.length,
        status: updateData.status
      });
    } else {
      // If not updating attendance, preserve existing attendance
      if (currentData.attendance && currentData.attendance.length > 0) {
        // Preserve existing attendance
        updateData.attendance = currentData.attendance;
        
        // Keep completed status if attendance exists
        if (!data.hasOwnProperty('status')) {
          updateData.status = 'completed';
        }
      }
    }
    
    // Always add update timestamp
    updateData.lastUpdated = serverTimestamp();
    
    // Update the document
    await updateDoc(scheduleRef, updateData);
    
    console.log('Successfully updated schedule:', scheduleId);
  } catch (error) {
    console.error('Error updating class schedule:', error);
    throw error;
  }
}

// Generate schedule dates
function generateSchedules(
  startDate: Date,
  endDate: Date,
  daysOfWeek: number[],
  totalSessions: number,
  holidayDates: Date[]
): Date[] {
  const schedules: Date[] = [];
  const currentDate = new Date(startDate);
  
  // Convert holiday dates to date strings for comparison
  const holidayStrings = holidayDates.map(date => 
    date.toISOString().split('T')[0]
  );
  
  while (schedules.length < totalSessions && currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const dateString = currentDate.toISOString().split('T')[0];
    
    if (daysOfWeek.includes(dayOfWeek) && !holidayStrings.includes(dateString)) {
      schedules.push(new Date(currentDate));
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return schedules;
}

// Check if class code exists
export async function checkClassCodeExists(code: string, excludeId?: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('code', '==', code)
    );
    const querySnapshot = await getDocs(q);
    
    if (excludeId) {
      return querySnapshot.docs.some(doc => doc.id !== excludeId);
    }
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking class code:', error);
    throw error;
  }
}

// Update class status
export async function updateClassStatus(id: string, status: Class['status']): Promise<void> {
  try {
    // Validate status
    const validStatuses = ['draft', 'published', 'started', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { status });
  } catch (error) {
    console.error('Error updating class status:', error);
    throw error;
  }
}

// Get active classes (published or started)
export async function getActiveClasses(branchId?: string): Promise<Class[]> {
  try {
    const classes = await getClasses(branchId);
    return classes.filter(c => c.status === 'published' || c.status === 'started');
  } catch (error) {
    console.error('Error getting active classes:', error);
    return [];
  }
}

// Check room availability for a time slot (comprehensive check for all types)
export async function checkRoomAvailability(
  branchId: string,
  roomId: string,
  daysOfWeek: number[],
  startTime: string,
  endTime: string,
  startDate: Date,
  endDate: Date,
  excludeClassId?: string
): Promise<{ available: boolean; conflicts?: any[] }> {
  try {
    const conflicts: any[] = [];

    // 1. Check regular classes in the same branch
    const classes = await getClassesByBranch(branchId);
    
    // Filter classes that might conflict
    const potentialClassConflicts = classes.filter(cls => {
      // Skip the class we're editing
      if (excludeClassId && cls.id === excludeClassId) return false;
      
      // Skip cancelled or completed classes
      if (cls.status === 'cancelled' || cls.status === 'completed') return false;
      
      // Check if same room
      if (cls.roomId !== roomId) return false;
      
      // Check if there's any day overlap
      const dayOverlap = cls.daysOfWeek.some(day => daysOfWeek.includes(day));
      if (!dayOverlap) return false;
      
      // Check date range overlap
      const dateOverlap = (
        (startDate >= cls.startDate && startDate <= cls.endDate) ||
        (endDate >= cls.startDate && endDate <= cls.endDate) ||
        (startDate <= cls.startDate && endDate >= cls.endDate)
      );
      if (!dateOverlap) return false;
      
      // Check time overlap
      const timeOverlap = (
        (startTime >= cls.startTime && startTime < cls.endTime) ||
        (endTime > cls.startTime && endTime <= cls.endTime) ||
        (startTime <= cls.startTime && endTime >= cls.endTime)
      );
      
      return timeOverlap;
    });
    
    // Add class conflicts
    potentialClassConflicts.forEach(cls => {
      conflicts.push({
        type: 'class',
        classId: cls.id,
        className: cls.name,
        classCode: cls.code,
        startTime: cls.startTime,
        endTime: cls.endTime,
        daysOfWeek: cls.daysOfWeek,
      });
    });

    // 2. Check Makeup Classes
    const { getMakeupClasses } = await import('./makeup');
    const makeupClasses = await getMakeupClasses();
    
    // Filter makeup classes for conflicts
    const relevantMakeups = makeupClasses.filter(makeup => 
      makeup.status === 'scheduled' &&
      makeup.makeupSchedule &&
      makeup.makeupSchedule.branchId === branchId &&
      makeup.makeupSchedule.roomId === roomId
    );
    
    // Check each makeup class
    for (const makeup of relevantMakeups) {
      if (!makeup.makeupSchedule) continue;
      
      const makeupDate = new Date(makeup.makeupSchedule.date);
      const makeupDay = makeupDate.getDay();
      
      // Check if makeup day matches any of the class days
      if (!daysOfWeek.includes(makeupDay)) continue;
      
      // Check if makeup date falls within the class date range
      if (makeupDate < startDate || makeupDate > endDate) continue;
      
      // Check time overlap
      if (startTime < makeup.makeupSchedule.endTime && endTime > makeup.makeupSchedule.startTime) {
        // Get student info for display
        const { getStudent } = await import('./parents');
        const student = await getStudent(makeup.parentId, makeup.studentId);
        
        conflicts.push({
          type: 'makeup',
          classId: makeup.id,
          className: `Makeup: ${student?.nickname || student?.name || 'Unknown'}`,
          classCode: '',
          startTime: makeup.makeupSchedule.startTime,
          endTime: makeup.makeupSchedule.endTime,
          daysOfWeek: [makeupDay],
          date: makeupDate
        });
      }
    }

    // 3. Check Trial Sessions
    const { getTrialSessions } = await import('./trial-bookings');
    const trialSessions = await getTrialSessions();
    
    // Filter trial sessions for conflicts
    const relevantTrials = trialSessions.filter(trial => 
      trial.status === 'scheduled' &&
      trial.branchId === branchId &&
      trial.roomId === roomId
    );
    
    // Check each trial session
    for (const trial of relevantTrials) {
      const trialDate = new Date(trial.scheduledDate);
      const trialDay = trialDate.getDay();
      
      // Check if trial day matches any of the class days
      if (!daysOfWeek.includes(trialDay)) continue;
      
      // Check if trial date falls within the class date range
      if (trialDate < startDate || trialDate > endDate) continue;
      
      // Check time overlap
      if (startTime < trial.endTime && endTime > trial.startTime) {
        conflicts.push({
          type: 'trial',
          classId: trial.id,
          className: `ทดลองเรียน: ${trial.studentName}`,
          classCode: '',
          startTime: trial.startTime,
          endTime: trial.endTime,
          daysOfWeek: [trialDay],
          date: trialDate
        });
      }
    }
    
    return {
      available: conflicts.length === 0,
      conflicts: conflicts.length > 0 ? conflicts : undefined
    };
  } catch (error) {
    console.error('Error checking room availability:', error);
    return { available: false };
  }
}

// Get upcoming sessions for a class
export async function getUpcomingSessions(
  classId: string,
  fromDate?: Date
): Promise<ClassSchedule[]> {
  try {
    const schedulesRef = collection(db, COLLECTION_NAME, classId, 'schedules');
    const startDate = fromDate || new Date();
    
    const q = query(
      schedulesRef,
      where('sessionDate', '>=', Timestamp.fromDate(startDate)),
      where('status', '!=', 'cancelled'),
      orderBy('sessionDate', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      classId,
      ...doc.data(),
      sessionDate: doc.data().sessionDate?.toDate() || new Date(),
      originalDate: doc.data().originalDate?.toDate(),
      rescheduledAt: doc.data().rescheduledAt?.toDate(),
    } as ClassSchedule));
  } catch (error) {
    console.error('Error getting upcoming sessions:', error);
    return [];
  }
}

// Reschedule a single session
export async function rescheduleSession(
  classId: string,
  scheduleId: string,
  newDate: Date,
  reason?: string,
  rescheduledBy?: string
): Promise<void> {
  try {
    const scheduleRef = doc(db, COLLECTION_NAME, classId, 'schedules', scheduleId);
    
    // Get current schedule
    const scheduleDoc = await getDoc(scheduleRef);
    if (!scheduleDoc.exists()) {
      throw new Error('Schedule not found');
    }
    
    const currentData = scheduleDoc.data();
    
    await updateDoc(scheduleRef, {
      sessionDate: Timestamp.fromDate(newDate),
      status: 'rescheduled',
      originalDate: currentData.sessionDate, // Keep original date
      rescheduledAt: serverTimestamp(),
      rescheduledBy: rescheduledBy || '',
      note: reason || ''
    });
  } catch (error) {
    console.error('Error rescheduling session:', error);
    throw error;
  }
}

// Get class statistics
export async function getClassStatistics(classId: string): Promise<{
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  cancelledSessions: number;
  attendanceRate: number;
}> {
  try {
    const schedules = await getClassSchedules(classId);
    const now = new Date();
    
    const stats = {
      totalSessions: schedules.length,
      completedSessions: 0,
      upcomingSessions: 0,
      cancelledSessions: 0,
      attendanceRate: 0,
    };
    
    let totalAttendanceCount = 0;
    let totalStudentSessions = 0;
    
    schedules.forEach(schedule => {
      if (schedule.status === 'cancelled') {
        stats.cancelledSessions++;
      } else if (schedule.sessionDate > now) {
        stats.upcomingSessions++;
      } else if (schedule.status === 'completed' || schedule.attendance) {
        stats.completedSessions++;
        
        // Calculate attendance rate
        if (schedule.attendance) {
          const presentCount = schedule.attendance.filter(a => a.status === 'present').length;
          totalAttendanceCount += presentCount;
          totalStudentSessions += schedule.attendance.length;
        }
      }
    });
    
    if (totalStudentSessions > 0) {
      stats.attendanceRate = (totalAttendanceCount / totalStudentSessions) * 100;
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting class statistics:', error);
    return {
      totalSessions: 0,
      completedSessions: 0,
      upcomingSessions: 0,
      cancelledSessions: 0,
      attendanceRate: 0,
    };
  }
}

// Batch update multiple schedules
export async function batchUpdateSchedules(
  classId: string,
  updates: Array<{ scheduleId: string; data: Partial<ClassSchedule> }>
): Promise<void> {
  try {
    const batch = writeBatch(db);
    
    updates.forEach(({ scheduleId, data }) => {
      const scheduleRef = doc(db, COLLECTION_NAME, classId, 'schedules', scheduleId);
      
      // Convert dates to Timestamps if needed
      const updateData: any = { ...data };
      if (data.sessionDate) {
        updateData.sessionDate = Timestamp.fromDate(data.sessionDate);
      }
      if (data.originalDate) {
        updateData.originalDate = Timestamp.fromDate(data.originalDate);
      }
      
      batch.update(scheduleRef, updateData);
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error batch updating schedules:', error);
    throw error;
  }
}

// Fix enrolled count (add this new function)
export async function fixEnrolledCount(classId: string, newCount: number): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, classId);
    await updateDoc(docRef, { enrolledCount: newCount });
  } catch (error) {
    console.error('Error fixing enrolled count:', error);
    throw error;
  }
}

// Get class with schedules included
export async function getClassWithSchedules(classId: string): Promise<(Class & { schedules?: ClassSchedule[] }) | null> {
  try {
    const classData = await getClass(classId);
    if (!classData) return null;
    
    const schedules = await getClassSchedules(classId);
    return {
      ...classData,
      schedules
    };
  } catch (error) {
    console.error('Error getting class with schedules:', error);
    return null;
  }
}

// Get attendance for a specific student across all classes
export async function getStudentAttendanceHistory(
  studentId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Array<{
  classId: string;
  scheduleId: string;
  sessionDate: Date;
  sessionNumber: number;
  status: 'present' | 'absent' | 'late';
  note?: string;
  checkedAt?: Date;
  checkedBy?: string;
}>> {
  try {
    // Get all enrollments for this student
    const { getEnrollmentsByStudent } = await import('./enrollments');
    const enrollments = await getEnrollmentsByStudent(studentId);
    
    const attendanceHistory: any[] = [];
    
    // For each enrolled class
    for (const enrollment of enrollments) {
      const schedules = await getClassSchedules(enrollment.classId);
      
      // Filter by date range if provided
      const filteredSchedules = schedules.filter(schedule => {
        if (startDate && schedule.sessionDate < startDate) return false;
        if (endDate && schedule.sessionDate > endDate) return false;
        return true;
      });
      
      // Extract attendance for this student
      filteredSchedules.forEach(schedule => {
        if (schedule.attendance) {
          const studentAttendance = schedule.attendance.find(
            att => att.studentId === studentId
          );
          
          if (studentAttendance) {
            attendanceHistory.push({
              classId: enrollment.classId,
              scheduleId: schedule.id,
              sessionDate: schedule.sessionDate,
              sessionNumber: schedule.sessionNumber,
              status: studentAttendance.status,
              note: studentAttendance.note,
              checkedAt: (studentAttendance as any).checkedAt,
              checkedBy: (studentAttendance as any).checkedBy
            });
          }
        }
      });
    }
    
    // Sort by date
    return attendanceHistory.sort((a, b) => 
      b.sessionDate.getTime() - a.sessionDate.getTime()
    );
  } catch (error) {
    console.error('Error getting student attendance history:', error);
    return [];
  }
}

// Get attendance summary for a class
export async function getClassAttendanceSummary(classId: string): Promise<{
  totalSessions: number;
  completedSessions: number;
  studentStats: Map<string, {
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
  }>;
}> {
  try {
    const schedules = await getClassSchedules(classId);
    const studentStats = new Map();
    
    let completedSessions = 0;
    
    schedules.forEach(schedule => {
      if (schedule.attendance && schedule.attendance.length > 0) {
        completedSessions++;
        
        schedule.attendance.forEach(att => {
          if (!studentStats.has(att.studentId)) {
            studentStats.set(att.studentId, {
              present: 0,
              absent: 0,
              late: 0,
              attendanceRate: 0
            });
          }
          
          const stats = studentStats.get(att.studentId)!;
          if (att.status === 'present') stats.present++;
          else if (att.status === 'absent') stats.absent++;
          else if (att.status === 'late') stats.late++;
        });
      }
    });
    
    // Calculate attendance rate for each student
    studentStats.forEach((stats, studentId) => {
      const total = stats.present + stats.absent + stats.late;
      if (total > 0) {
        stats.attendanceRate = ((stats.present + stats.late) / total) * 100;
      }
    });
    
    return {
      totalSessions: schedules.length,
      completedSessions,
      studentStats
    };
  } catch (error) {
    console.error('Error getting class attendance summary:', error);
    return {
      totalSessions: 0,
      completedSessions: 0,
      studentStats: new Map()
    };
  }
}

// Export functions
export {
  generateSchedules,
};