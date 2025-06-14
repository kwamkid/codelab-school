// lib/services/makeup.ts

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
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { MakeupClass } from '@/types/models';
import { getClassSchedule, updateClassSchedule } from './classes';

const COLLECTION_NAME = 'makeupClasses';

// Get all makeup classes
export async function getMakeupClasses(): Promise<MakeupClass[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestDate: doc.data().requestDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate(),
      makeupSchedule: doc.data().makeupSchedule ? {
        ...doc.data().makeupSchedule,
        date: doc.data().makeupSchedule.date?.toDate() || new Date(),
        confirmedAt: doc.data().makeupSchedule.confirmedAt?.toDate(),
      } : undefined,
      attendance: doc.data().attendance ? {
        ...doc.data().attendance,
        checkedAt: doc.data().attendance.checkedAt?.toDate() || new Date(),
      } : undefined,
    } as MakeupClass));
  } catch (error) {
    console.error('Error getting makeup classes:', error);
    throw error;
  }
}

// Get makeup classes by student
export async function getMakeupClassesByStudent(studentId: string): Promise<MakeupClass[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestDate: doc.data().requestDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate(),
      makeupSchedule: doc.data().makeupSchedule ? {
        ...doc.data().makeupSchedule,
        date: doc.data().makeupSchedule.date?.toDate() || new Date(),
        confirmedAt: doc.data().makeupSchedule.confirmedAt?.toDate(),
      } : undefined,
      attendance: doc.data().attendance ? {
        ...doc.data().attendance,
        checkedAt: doc.data().attendance.checkedAt?.toDate() || new Date(),
      } : undefined,
    } as MakeupClass));
  } catch (error) {
    console.error('Error getting makeup classes by student:', error);
    throw error;
  }
}

// Get makeup classes by class
export async function getMakeupClassesByClass(classId: string): Promise<MakeupClass[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('originalClassId', '==', classId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestDate: doc.data().requestDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate(),
      makeupSchedule: doc.data().makeupSchedule ? {
        ...doc.data().makeupSchedule,
        date: doc.data().makeupSchedule.date?.toDate() || new Date(),
        confirmedAt: doc.data().makeupSchedule.confirmedAt?.toDate(),
      } : undefined,
      attendance: doc.data().attendance ? {
        ...doc.data().attendance,
        checkedAt: doc.data().attendance.checkedAt?.toDate() || new Date(),
      } : undefined,
    } as MakeupClass));
  } catch (error) {
    console.error('Error getting makeup classes by class:', error);
    throw error;
  }
}

// Get single makeup class
export async function getMakeupClass(id: string): Promise<MakeupClass | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        requestDate: data.requestDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        makeupSchedule: data.makeupSchedule ? {
          ...data.makeupSchedule,
          date: data.makeupSchedule.date?.toDate() || new Date(),
          confirmedAt: data.makeupSchedule.confirmedAt?.toDate(),
        } : undefined,
        attendance: data.attendance ? {
          ...data.attendance,
          checkedAt: data.attendance.checkedAt?.toDate() || new Date(),
        } : undefined,
      } as MakeupClass;
    }
    return null;
  } catch (error) {
    console.error('Error getting makeup class:', error);
    throw error;
  }
}

// Count makeup classes for student in a class
export async function getMakeupCount(studentId: string, classId: string): Promise<number> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentId),
      where('originalClassId', '==', classId),
      where('status', '!=', 'cancelled')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error counting makeup classes:', error);
    return 0;
  }
}

// Get makeup requests for specific schedules (NEW FUNCTION)
export async function getMakeupRequestsBySchedules(
  studentId: string,
  classId: string,
  scheduleIds: string[]
): Promise<Record<string, MakeupClass>> {
  try {
    // Query all makeup requests for this student and class
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentId),
      where('originalClassId', '==', classId),
      where('status', '!=', 'cancelled')
    );
    
    const querySnapshot = await getDocs(q);
    const makeupBySchedule: Record<string, MakeupClass> = {};
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (scheduleIds.includes(data.originalScheduleId)) {
        makeupBySchedule[data.originalScheduleId] = {
          id: doc.id,
          ...data,
          requestDate: data.requestDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
          makeupSchedule: data.makeupSchedule ? {
            ...data.makeupSchedule,
            date: data.makeupSchedule.date?.toDate() || new Date(),
            confirmedAt: data.makeupSchedule.confirmedAt?.toDate(),
          } : undefined,
          attendance: data.attendance ? {
            ...data.attendance,
            checkedAt: data.attendance.checkedAt?.toDate() || new Date(),
          } : undefined,
        } as MakeupClass;
      }
    });
    
    return makeupBySchedule;
  } catch (error) {
    console.error('Error getting makeup requests by schedules:', error);
    return {};
  }
}

// Check if makeup already exists for a schedule (NEW FUNCTION)
export async function checkMakeupExists(
  studentId: string,
  classId: string,
  scheduleId: string
): Promise<MakeupClass | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentId),
      where('originalClassId', '==', classId),
      where('originalScheduleId', '==', scheduleId),
      where('status', '!=', 'cancelled')
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.size > 0) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        requestDate: data.requestDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        makeupSchedule: data.makeupSchedule ? {
          ...data.makeupSchedule,
          date: data.makeupSchedule.date?.toDate() || new Date(),
          confirmedAt: data.makeupSchedule.confirmedAt?.toDate(),
        } : undefined,
        attendance: data.attendance ? {
          ...data.attendance,
          checkedAt: data.attendance.checkedAt?.toDate() || new Date(),
        } : undefined,
      } as MakeupClass;
    }
    return null;
  } catch (error) {
    console.error('Error checking makeup exists:', error);
    return null;
  }
}

// Create makeup class request
export async function createMakeupRequest(
  data: Omit<MakeupClass, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    // Check if makeup already exists for this schedule
    const existingMakeup = await checkMakeupExists(
      data.studentId,
      data.originalClassId,
      data.originalScheduleId
    );
    
    if (existingMakeup) {
      throw new Error('Makeup request already exists for this schedule');
    }
    
    const batch = writeBatch(db);
    
    // 1. Create makeup request
    const docRef = doc(collection(db, COLLECTION_NAME));
    batch.set(docRef, {
      ...data,
      requestDate: Timestamp.fromDate(data.requestDate),
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    
    // 2. Update original schedule attendance to absent
    if (data.originalScheduleId) {
      const scheduleData = await getClassSchedule(data.originalClassId, data.originalScheduleId);
      if (scheduleData) {
        const updatedAttendance = scheduleData.attendance || [];
        const studentIndex = updatedAttendance.findIndex(a => a.studentId === data.studentId);
        
        if (studentIndex >= 0) {
          updatedAttendance[studentIndex] = {
            studentId: data.studentId,
            status: 'absent',
            note: `Makeup requested: ${data.reason}`
          };
        } else {
          updatedAttendance.push({
            studentId: data.studentId,
            status: 'absent',
            note: `Makeup requested: ${data.reason}`
          });
        }
        
        await updateClassSchedule(data.originalClassId, data.originalScheduleId, {
          attendance: updatedAttendance
        });
      }
    }
    
    await batch.commit();
    return docRef.id;
  } catch (error) {
    console.error('Error creating makeup request:', error);
    throw error;
  }
}

// Schedule makeup class
export async function scheduleMakeupClass(
  makeupId: string,
  scheduleData: MakeupClass['makeupSchedule'] & { confirmedBy: string }
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, makeupId);
    
    await updateDoc(docRef, {
      status: 'scheduled',
      makeupSchedule: {
        ...scheduleData,
        date: Timestamp.fromDate(scheduleData.date),
        confirmedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error scheduling makeup class:', error);
    throw error;
  }
}

// Record makeup attendance
export async function recordMakeupAttendance(
  makeupId: string,
  attendance: {
    status: 'present' | 'absent';
    checkedBy: string;
    note?: string;
  }
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, makeupId);
    
    await updateDoc(docRef, {
      status: 'completed',
      attendance: {
        ...attendance,
        checkedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error recording makeup attendance:', error);
    throw error;
  }
}

// Cancel makeup class
export async function cancelMakeupClass(
  makeupId: string,
  reason: string,
  cancelledBy: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, makeupId);
    
    await updateDoc(docRef, {
      status: 'cancelled',
      notes: reason,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error cancelling makeup class:', error);
    throw error;
  }
}

// Get upcoming makeup classes for a branch
export async function getUpcomingMakeupClasses(
  branchId: string,
  startDate: Date,
  endDate: Date
): Promise<MakeupClass[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'scheduled'),
      where('makeupSchedule.branchId', '==', branchId),
      where('makeupSchedule.date', '>=', Timestamp.fromDate(startDate)),
      where('makeupSchedule.date', '<=', Timestamp.fromDate(endDate))
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestDate: doc.data().requestDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate(),
      makeupSchedule: doc.data().makeupSchedule ? {
        ...doc.data().makeupSchedule,
        date: doc.data().makeupSchedule.date?.toDate() || new Date(),
        confirmedAt: doc.data().makeupSchedule.confirmedAt?.toDate(),
      } : undefined,
    } as MakeupClass));
  } catch (error) {
    console.error('Error getting upcoming makeup classes:', error);
    throw error;
  }
}

// Update makeup attendance (NEW FUNCTION)
export async function updateMakeupAttendance(
  makeupId: string,
  attendance: {
    status: 'present' | 'absent';
    checkedBy: string;
    note?: string;
  }
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, makeupId);
    
    // Get current makeup data
    const makeup = await getMakeupClass(makeupId);
    if (!makeup) {
      throw new Error('Makeup class not found');
    }
    
    // Only allow updating if already completed
    if (makeup.status !== 'completed') {
      throw new Error('Can only update attendance for completed makeup classes');
    }
    
    await updateDoc(docRef, {
      attendance: {
        ...attendance,
        checkedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating makeup attendance:', error);
    throw error;
  }
}

// Revert makeup to scheduled status (NEW FUNCTION)
export async function revertMakeupToScheduled(
  makeupId: string,
  revertedBy: string,
  reason: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, makeupId);
    
    // Get current makeup data
    const makeup = await getMakeupClass(makeupId);
    if (!makeup) {
      throw new Error('Makeup class not found');
    }
    
    // Only allow reverting if completed
    if (makeup.status !== 'completed') {
      throw new Error('Can only revert completed makeup classes');
    }
    
    const batch = writeBatch(db);
    
    // Update makeup status back to scheduled
    batch.update(docRef, {
      status: 'scheduled',
      attendance: null,
      updatedAt: serverTimestamp(),
      notes: `${makeup.notes || ''}\n[${new Date().toLocaleDateString('th-TH')}] ยกเลิกการบันทึกเข้าเรียน: ${reason} (โดย ${revertedBy})`
    });
    
    // Create revert log
    const logRef = doc(collection(db, 'auditLogs'));
    batch.set(logRef, {
      type: 'makeup_attendance_reverted',
      documentId: makeupId,
      performedBy: revertedBy,
      performedAt: serverTimestamp(),
      reason,
      previousData: {
        status: makeup.status,
        attendance: makeup.attendance
      }
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error reverting makeup status:', error);
    throw error;
  }
}
export async function deleteMakeupClass(
  makeupId: string,
  deletedBy: string,
  reason?: string
): Promise<void> {
  try {
    // Get makeup details first
    const makeup = await getMakeupClass(makeupId);
    if (!makeup) {
      throw new Error('Makeup class not found');
    }

    // Only allow deletion of pending or scheduled status
    if (makeup.status === 'completed') {
      throw new Error('Cannot delete completed makeup class');
    }

    const batch = writeBatch(db);

    // 1. Delete the makeup document
    const makeupRef = doc(db, COLLECTION_NAME, makeupId);
    batch.delete(makeupRef);

    // 2. Update original schedule attendance if needed
    if (makeup.originalScheduleId && makeup.originalClassId) {
      const scheduleData = await getClassSchedule(makeup.originalClassId, makeup.originalScheduleId);
      if (scheduleData && scheduleData.attendance) {
        // Remove or update the attendance record
        const updatedAttendance = scheduleData.attendance.filter(
          a => a.studentId !== makeup.studentId
        );
        
        // Update the schedule
        const scheduleRef = doc(db, 'classes', makeup.originalClassId, 'schedules', makeup.originalScheduleId);
        batch.update(scheduleRef, {
          attendance: updatedAttendance
        });
      }
    }

    // 3. Create deletion log (optional - in a separate collection)
    const logRef = doc(collection(db, 'deletionLogs'));
    batch.set(logRef, {
      type: 'makeup_class',
      documentId: makeupId,
      deletedBy,
      deletedAt: serverTimestamp(),
      reason: reason || 'No reason provided',
      originalData: {
        studentId: makeup.studentId,
        classId: makeup.originalClassId,
        scheduleId: makeup.originalScheduleId,
        status: makeup.status,
        requestDate: makeup.requestDate
      }
    });

    await batch.commit();
  } catch (error) {
    console.error('Error deleting makeup class:', error);
    throw error;
  }
}
export async function checkTeacherAvailability(
  teacherId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<boolean> {
  try {
    // Check regular classes
    const classQuery = query(
      collection(db, 'classes'),
      where('teacherId', '==', teacherId),
      where('status', 'in', ['published', 'started'])
    );
    
    const classSnapshot = await getDocs(classQuery);
    const dayOfWeek = date.getDay();
    
    for (const doc of classSnapshot.docs) {
      const classData = doc.data();
      if (classData.daysOfWeek.includes(dayOfWeek)) {
        // Check time overlap
        if (startTime < classData.endTime && endTime > classData.startTime) {
          return false;
        }
      }
    }
    
    // Check other makeup classes
    const makeupQuery = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'scheduled'),
      where('makeupSchedule.teacherId', '==', teacherId),
      where('makeupSchedule.date', '==', Timestamp.fromDate(date))
    );
    
    const makeupSnapshot = await getDocs(makeupQuery);
    
    for (const doc of makeupSnapshot.docs) {
      const makeupData = doc.data();
      const schedule = makeupData.makeupSchedule;
      if (startTime < schedule.endTime && endTime > schedule.startTime) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error checking teacher availability:', error);
    return false;
  }
}

// Get makeup class by original schedule
export async function getMakeupByOriginalSchedule(
  studentId: string,
  classId: string,
  scheduleId: string
): Promise<MakeupClass | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentId),
      where('originalClassId', '==', classId),
      where('originalScheduleId', '==', scheduleId),
      where('status', 'in', ['pending', 'scheduled'])
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.size > 0) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        requestDate: data.requestDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        makeupSchedule: data.makeupSchedule ? {
          ...data.makeupSchedule,
          date: data.makeupSchedule.date?.toDate() || new Date(),
          confirmedAt: data.makeupSchedule.confirmedAt?.toDate(),
        } : undefined,
        attendance: data.attendance ? {
          ...data.attendance,
          checkedAt: data.attendance.checkedAt?.toDate() || new Date(),
        } : undefined,
      } as MakeupClass;
    }
    return null;
  } catch (error) {
    console.error('Error getting makeup by original schedule:', error);
    return null;
  }
}

// Delete makeup class (soft delete for completed, hard delete for pending/scheduled)
export async function deleteMakeupForSchedule(
  studentId: string,
  classId: string,
  scheduleId: string,
  deletedBy: string,
  reason: string = 'Attendance updated to present'
): Promise<void> {
  try {
    const makeup = await getMakeupByOriginalSchedule(studentId, classId, scheduleId);
    if (!makeup) return;

    if (makeup.status === 'completed') {
      // For completed makeup, just update status to cancelled
      await cancelMakeupClass(makeup.id, reason, deletedBy);
    } else {
      // For pending/scheduled, delete the makeup
      await deleteMakeupClass(makeup.id, deletedBy, reason);
    }
  } catch (error) {
    console.error('Error deleting makeup for schedule:', error);
    throw error;
  }
}
