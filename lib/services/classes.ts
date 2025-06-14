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
import { Class, ClassSchedule, RoomAvailabilityResult } from '@/types/models';
import { getHolidaysForBranch } from './holidays';

const COLLECTION_NAME = 'classes';

// Get all classes
export async function getClasses(): Promise<Class[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
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
    console.error('Error getting classes:', error);
    throw error;
  }
}

// Fix enrolled count (for data correction)
export async function fixEnrolledCount(classId: string, correctCount: number): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, classId);
    await updateDoc(docRef, {
      enrolledCount: Math.max(0, correctCount) // Ensure it's never negative
    });
  } catch (error) {
    console.error('Error fixing enrolled count:', error);
    throw error;
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
    throw error;
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

// Create new class
export async function createClass(classData: Omit<Class, 'id' | 'createdAt'>): Promise<string> {
  try {
    // ตรวจสอบว่าวันเริ่มต้นผ่านมาแล้วหรือยัง
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(classData.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    // ถ้าวันเริ่มต้นผ่านมาแล้ว ให้เปลี่ยนสถานะเป็น started
    let status = classData.status;
    if (startDate <= today && (status === 'draft' || status === 'published')) {
      status = 'started';
    }
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...classData,
      status,
      startDate: Timestamp.fromDate(classData.startDate),
      endDate: Timestamp.fromDate(classData.endDate),
      createdAt: serverTimestamp(),
    });
    
    // Generate schedules for the class
    await generateClassSchedules(docRef.id, classData);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating class:', error);
    throw error;
  }
}

// Update class
export async function updateClass(id: string, classData: Partial<Class>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // Remove fields that shouldn't be updated
    const dataToUpdate = { ...classData };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (dataToUpdate as any).id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (dataToUpdate as any).createdAt;
    
    // Convert dates to Firestore timestamps
    if (dataToUpdate.startDate instanceof Date) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dataToUpdate as any).startDate = Timestamp.fromDate(dataToUpdate.startDate);
    }
    if (dataToUpdate.endDate instanceof Date) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dataToUpdate as any).endDate = Timestamp.fromDate(dataToUpdate.endDate);
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(docRef, dataToUpdate as any);
  } catch (error) {
    console.error('Error updating class:', error);
    throw error;
  }
}

// Delete class (hard delete - only for classes with no students)
export async function deleteClass(id: string): Promise<void> {
  try {
    // Check if class has enrolled students
    const classData = await getClass(id);
    if (!classData) {
      throw new Error('Class not found');
    }
    
    // Allow deletion if enrolledCount is 0 or negative (to fix data issues)
    // Only prevent deletion if there are actual enrolled students (> 0)
    if (classData.enrolledCount > 0) {
      throw new Error('Cannot delete class with enrolled students');
    }
    
    // Use batch to delete class and all its schedules
    const batch = writeBatch(db);
    
    // Delete all schedules
    const schedulesRef = collection(db, COLLECTION_NAME, id, 'schedules');
    const schedulesSnapshot = await getDocs(schedulesRef);
    schedulesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the class document
    const classRef = doc(db, COLLECTION_NAME, id);
    batch.delete(classRef);
    
    // Commit the batch
    await batch.commit();
  } catch (error) {
    console.error('Error deleting class:', error);
    throw error;
  }
}

// Generate class schedules
async function generateClassSchedules(
  classId: string, 
  classData: Omit<Class, 'id' | 'createdAt'>
): Promise<void> {
  try {
    const schedulesRef = collection(db, COLLECTION_NAME, classId, 'schedules');
    const schedules = await generateScheduleDates(
      classData.startDate,
      classData.daysOfWeek,
      classData.totalSessions,
      classData.branchId
    );
    
    // Create schedule documents
    for (let i = 0; i < schedules.length; i++) {
      const scheduleData: Omit<ClassSchedule, 'id'> = {
        classId,
        sessionDate: schedules[i],
        sessionNumber: i + 1,
        status: 'scheduled',
      };
      
      await addDoc(schedulesRef, {
        ...scheduleData,
        sessionDate: Timestamp.fromDate(scheduleData.sessionDate),
      });
    }
  } catch (error) {
    console.error('Error generating schedules:', error);
    throw error;
  }
}

// Generate schedule dates helper with holiday checking
async function generateScheduleDates(
  startDate: Date,
  daysOfWeek: number[],
  totalSessions: number,
  branchId: string
): Promise<Date[]> {
  const schedules: Date[] = [];
  const currentDate = new Date(startDate.getTime());
  
  // Calculate end date for holiday lookup (estimate max 6 months)
  const maxEndDate = new Date(startDate);
  maxEndDate.setMonth(maxEndDate.getMonth() + 6);
  
  // Get all holidays for the branch in the date range
  const holidays = await getHolidaysForBranch(branchId, startDate, maxEndDate);

  // Create a Set of holiday dates for faster lookup
  // ทุกวันหยุดคือวันปิดโรงเรียน
  const holidayDates = new Set(
    holidays.map(h => h.date.toDateString())
  );
  
  while (schedules.length < totalSessions) {
    const dayOfWeek = currentDate.getDay();
    
    // Check if it's a scheduled day and not a holiday
    if (daysOfWeek.includes(dayOfWeek) && !holidayDates.has(currentDate.toDateString())) {
      schedules.push(new Date(currentDate));
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return schedules;
}

// Get class schedules
export async function getClassSchedules(classId: string): Promise<ClassSchedule[]> {
  try {
    const schedulesRef = collection(db, COLLECTION_NAME, classId, 'schedules');
    const q = query(schedulesRef, orderBy('sessionNumber', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      sessionDate: doc.data().sessionDate?.toDate() || new Date(),
      originalDate: doc.data().originalDate?.toDate(),
      rescheduledAt: doc.data().rescheduledAt?.toDate(),
    } as ClassSchedule));
  } catch (error) {
    console.error('Error getting class schedules:', error);
    throw error;
  }
}

// Get single class schedule
export async function getClassSchedule(classId: string, scheduleId: string): Promise<ClassSchedule | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, classId, 'schedules', scheduleId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('Raw schedule data from Firestore:', data); // Debug log
      
      return {
        id: docSnap.id,
        ...data,
        sessionDate: data.sessionDate?.toDate() || new Date(),
        originalDate: data.originalDate?.toDate(),
        rescheduledAt: data.rescheduledAt?.toDate(),
        attendance: data.attendance || [] // Make sure attendance is included
      } as ClassSchedule;
    }
    return null;
  } catch (error) {
    console.error('Error getting class schedule:', error);
    throw error;
  }
}

// Update class schedule
export async function updateClassSchedule(
  classId: string,
  scheduleId: string,
  scheduleData: Partial<ClassSchedule>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, classId, 'schedules', scheduleId);
    
    // Remove fields that shouldn't be updated
    const dataToUpdate = { ...scheduleData };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (dataToUpdate as any).id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (dataToUpdate as any).classId;
    
    // Convert dates to Firestore timestamp
    if (dataToUpdate.sessionDate instanceof Date) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dataToUpdate as any).sessionDate = Timestamp.fromDate(dataToUpdate.sessionDate);
    }
    
    if (dataToUpdate.originalDate instanceof Date) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dataToUpdate as any).originalDate = Timestamp.fromDate(dataToUpdate.originalDate);
    }
    
    if (dataToUpdate.rescheduledAt instanceof Date) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dataToUpdate as any).rescheduledAt = Timestamp.fromDate(dataToUpdate.rescheduledAt);
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(docRef, dataToUpdate as any);
  } catch (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }
}

// Get upcoming classes
export async function getUpcomingClasses(limit: number = 10): Promise<Class[]> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', 'in', ['published', 'started']),
      where('endDate', '>=', Timestamp.fromDate(today)),
      orderBy('endDate', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      } as Class))
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting upcoming classes:', error);
    throw error;
  }
}

// Check if room is available (Enhanced version)
export async function checkRoomAvailability(
  branchId: string,
  roomId: string,
  daysOfWeek: number[],
  startTime: string,
  endTime: string,
  startDate: Date,
  endDate: Date,
  excludeClassId?: string
): Promise<RoomAvailabilityResult> {
  try {
    // Get all classes in the same branch and room
    const q = query(
      collection(db, COLLECTION_NAME),
      where('branchId', '==', branchId),
      where('roomId', '==', roomId),
      where('status', '!=', 'cancelled')
    );
    
    const querySnapshot = await getDocs(q);
    const classes = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate() || new Date(),
      } as Class))
      .filter(cls => cls.id !== excludeClassId);
    
    const conflicts: RoomAvailabilityResult['conflicts'] = [];
    
    // Check for time conflicts
    for (const cls of classes) {
      // Check if date ranges overlap
      if (startDate <= cls.endDate && endDate >= cls.startDate) {
        // Check if days of week overlap
        const daysOverlap = cls.daysOfWeek.some(day => daysOfWeek.includes(day));
        if (daysOverlap) {
          // Check if time slots overlap
          if (startTime < cls.endTime && endTime > cls.startTime) {
            conflicts.push({
              classId: cls.id,
              className: cls.name,
              classCode: cls.code,
              startTime: cls.startTime,
              endTime: cls.endTime,
              daysOfWeek: cls.daysOfWeek
            });
          }
        }
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