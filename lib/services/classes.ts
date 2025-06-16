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
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Class, ClassSchedule, Room } from '@/types/models';
import { getRoomsByBranch } from './rooms';

const COLLECTION_NAME = 'classes';

// Get all classes
export async function getClasses(): Promise<Class[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
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

// Create new class with schedules
export async function createClass(
  classData: Omit<Class, 'id' | 'createdAt' | 'enrolledCount'>,
  holidayDates: Date[]
): Promise<string> {
  try {
    // Add class document
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...classData,
      startDate: Timestamp.fromDate(classData.startDate),
      endDate: Timestamp.fromDate(classData.endDate),
      enrolledCount: 0,
      createdAt: serverTimestamp(),
    });

    // Generate schedules
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

// Update class schedule with time validation
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
    
    const currentSchedule = scheduleDoc.data();
    const sessionDate = currentSchedule.sessionDate.toDate();
    
    // Get class info for time
    const classDoc = await getDoc(doc(db, COLLECTION_NAME, classId));
    if (!classDoc.exists()) {
      throw new Error('Class not found');
    }
    
    const classData = classDoc.data();
    const [endHour, endMinute] = classData.endTime.split(':').map(Number);
    
    // Create end time for this session
    const sessionEndTime = new Date(sessionDate);
    sessionEndTime.setHours(endHour, endMinute, 0, 0);
    
    const now = new Date();
    
    // Prepare update data
    const updateData: any = { ...data };
    
    // Check if trying to mark as completed but session hasn't ended yet
    if (data.status === 'completed' && sessionEndTime > now) {
      // Don't set to completed if session hasn't ended
      // Unless there's attendance data
      if (!data.attendance || data.attendance.length === 0) {
        delete updateData.status;
      }
    }
    
    // If clearing all attendance (all students unmarked), don't mark as completed
    if (data.attendance && data.attendance.length === 0 && sessionEndTime > now) {
      updateData.status = 'scheduled';
    }
    
    // Convert attendance array properly if exists
    if (updateData.attendance) {
      updateData.attendance = updateData.attendance.map((att: any) => ({
        studentId: att.studentId,
        status: att.status,
        note: att.note || ''
      }));
    }
    
    await updateDoc(scheduleRef, updateData);
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
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { status });
  } catch (error) {
    console.error('Error updating class status:', error);
    throw error;
  }
}

// Get active classes (published or started)
export async function getActiveClasses(): Promise<Class[]> {
  try {
    const classes = await getClasses();
    return classes.filter(c => c.status === 'published' || c.status === 'started');
  } catch (error) {
    console.error('Error getting active classes:', error);
    return [];
  }
}

// lib/services/classes.ts - แก้ไขฟังก์ชัน checkRoomAvailability

// Check room availability for a time slot (รวม makeup และ trial)
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

// Export functions
export {
  generateSchedules,
};