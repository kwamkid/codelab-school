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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Class, ClassSchedule } from '@/types/models';

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
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...classData,
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
    const updateData: Record<string, unknown> = { ...classData };
    
    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    
    // Convert dates to Firestore timestamps
    if (classData.startDate && classData.startDate instanceof Date) {
      updateData.startDate = Timestamp.fromDate(classData.startDate);
    }
    if (classData.endDate && classData.endDate instanceof Date) {
      updateData.endDate = Timestamp.fromDate(classData.endDate);
    }
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating class:', error);
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
    const schedules = generateScheduleDates(
      classData.startDate,
      classData.daysOfWeek,
      classData.totalSessions
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

// Generate schedule dates helper
function generateScheduleDates(
  startDate: Date,
  daysOfWeek: number[],
  totalSessions: number
): Date[] {
  const schedules: Date[] = [];
  const currentDate = new Date(startDate.getTime()); // Create a proper copy
  
  while (schedules.length < totalSessions) {
    const dayOfWeek = currentDate.getDay();
    
    if (daysOfWeek.includes(dayOfWeek)) {
      // TODO: Check holidays when holiday system is implemented
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
    } as ClassSchedule));
  } catch (error) {
    console.error('Error getting class schedules:', error);
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
    const updateData: Record<string, unknown> = { ...scheduleData };
    
    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.classId;
    
    // Convert date to Firestore timestamp
    if (scheduleData.sessionDate && scheduleData.sessionDate instanceof Date) {
      updateData.sessionDate = Timestamp.fromDate(scheduleData.sessionDate);
    }
    
    await updateDoc(docRef, updateData);
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

// Check if room is available
export async function checkRoomAvailability(
  branchId: string,
  roomId: string,
  daysOfWeek: number[],
  startTime: string,
  endTime: string,
  startDate: Date,
  endDate: Date,
  excludeClassId?: string
): Promise<boolean> {
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
    
    // Check for time conflicts
    for (const cls of classes) {
      // Check if date ranges overlap
      if (startDate <= cls.endDate && endDate >= cls.startDate) {
        // Check if days of week overlap
        const daysOverlap = cls.daysOfWeek.some(day => daysOfWeek.includes(day));
        if (daysOverlap) {
          // Check if time slots overlap
          if (startTime < cls.endTime && endTime > cls.startTime) {
            return false; // Conflict found
          }
        }
      }
    }
    
    return true; // No conflicts
  } catch (error) {
    console.error('Error checking room availability:', error);
    return false;
  }
}