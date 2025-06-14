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

// Create makeup class request
export async function createMakeupRequest(
  data: Omit<MakeupClass, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
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

// Check teacher availability for makeup
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