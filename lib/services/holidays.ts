import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Holiday } from '@/types/models';

const COLLECTION_NAME = 'holidays';

// Get holidays for a specific year
export async function getHolidays(year: number): Promise<Holiday[]> {
  try {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('date', '>=', Timestamp.fromDate(startOfYear)),
      where('date', '<=', Timestamp.fromDate(endOfYear)),
      orderBy('date', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
    } as Holiday));
  } catch (error) {
    console.error('Error getting holidays:', error);
    throw error;
  }
}

// Get holidays for a specific branch and date range
export async function getHolidaysForBranch(
  branchId: string,
  startDate: Date,
  endDate: Date
): Promise<Holiday[]> {
  try {
    // Get all holidays in date range
    const holidays = await getHolidaysInRange(startDate, endDate);
    
    // Filter holidays that apply to this branch
    return holidays.filter(holiday => {
      // National holidays apply to all branches
      if (holiday.type === 'national') return true;
      
      // Branch-specific holidays
      return holiday.branches?.includes(branchId);
    });
  } catch (error) {
    console.error('Error getting branch holidays:', error);
    throw error;
  }
}

// Get holidays in date range
export async function getHolidaysInRange(
  startDate: Date,
  endDate: Date
): Promise<Holiday[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
    } as Holiday));
  } catch (error) {
    console.error('Error getting holidays in range:', error);
    throw error;
  }
}

// Add new holiday
export async function addHoliday(
  holidayData: Omit<Holiday, 'id'>,
  userId?: string
): Promise<{ id: string; rescheduledCount: number }> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...holidayData,
      date: Timestamp.fromDate(holidayData.date),
    });
    
    // ตรวจสอบและ reschedule คลาสที่ได้รับผลกระทบ
    let rescheduledCount = 0;
    if (userId) {
      const { rescheduleClassesForHoliday } = await import('./reschedule');
      const holiday: Holiday = {
        id: docRef.id,
        ...holidayData
      };
      rescheduledCount = await rescheduleClassesForHoliday(holiday, userId);
    }
    
    return { id: docRef.id, rescheduledCount };
  } catch (error) {
    console.error('Error adding holiday:', error);
    throw error;
  }
}

// Update holiday
export async function updateHoliday(
  id: string, 
  holidayData: Partial<Holiday>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { ...holidayData };
    delete updateData.id;
    
    if (holidayData.date instanceof Date) {
      updateData.date = Timestamp.fromDate(holidayData.date);
    }
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating holiday:', error);
    throw error;
  }
}

// Delete holiday
export async function deleteHoliday(id: string): Promise<{ deletedCount: number; affectedClasses: { className: string; sessionDate: Date }[] }> {
  try {
    // ดึงข้อมูล holiday ก่อนลบ
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Holiday not found');
    }
    
    const holiday = {
      id: docSnap.id,
      ...docSnap.data(),
      date: docSnap.data().date?.toDate() || new Date(),
    } as Holiday;
    
    // ตรวจสอบคลาสที่ได้รับผลกระทบ
    const { getClassesOnHoliday } = await import('./reschedule');
    const affectedClasses = await getClassesOnHoliday(holiday);
    
    // ลบวันหยุด
    await deleteDoc(docRef);
    
    return { 
      deletedCount: 1, 
      affectedClasses 
    };
  } catch (error) {
    console.error('Error deleting holiday:', error);
    throw error;
  }
}

// Delete all holidays for a specific year
export async function deleteAllHolidays(year: number): Promise<number> {
  try {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('date', '>=', Timestamp.fromDate(startOfYear)),
      where('date', '<=', Timestamp.fromDate(endOfYear))
    );
    
    const querySnapshot = await getDocs(q);
    let deletedCount = 0;
    
    // Delete each holiday
    for (const doc of querySnapshot.docs) {
      await deleteDoc(doc.ref);
      deletedCount++;
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Error deleting all holidays:', error);
    throw error;
  }
}

// Check if holiday exists
export async function checkHolidayExists(
  date: Date, 
  name?: string,
  branchId?: string,
  excludeId?: string
): Promise<boolean> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay))
    );
    
    const querySnapshot = await getDocs(q);
    
    // Filter results
    const holidays = querySnapshot.docs.filter(doc => {
      // Exclude current holiday if editing
      if (excludeId && doc.id === excludeId) return false;
      
      const holiday = doc.data() as Holiday;
      
      // If name is provided, check for exact name match
      if (name && holiday.name === name) return true;
      
      // Check if it's the same branch or national holiday
      if (!branchId) {
        // If no branch specified, check for any holiday on this date
        return true;
      }
      
      if (holiday.type === 'national') return true;
      if (holiday.branches?.includes(branchId)) return true;
      
      return false;
    });
    
    return holidays.length > 0;
  } catch (error) {
    console.error('Error checking holiday exists:', error);
    return false;
  }
}

// Check if a specific date is a holiday for a branch
export async function isHoliday(
  date: Date,
  branchId: string
): Promise<boolean> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const holidays = await getHolidaysForBranch(branchId, startOfDay, endOfDay);
    
    // ทุกวันหยุดคือวันปิดโรงเรียน
    return holidays.length > 0;
  } catch (error) {
    console.error('Error checking if date is holiday:', error);
    return false;
  }
}

// Get holidays for calendar view
export async function getHolidaysForCalendar(
  year: number,
  month: number,
  branchId?: string
): Promise<Holiday[]> {
  try {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    if (branchId) {
      return getHolidaysForBranch(branchId, startDate, endDate);
    }
    
    return getHolidaysInRange(startDate, endDate);
  } catch (error) {
    console.error('Error getting holidays for calendar:', error);
    return [];
  }
}

// Reschedule classes for a specific holiday
export async function rescheduleClassesForDeletedHoliday(
  holidayId: string
): Promise<{ rescheduledCount: number; error?: string }> {
  try {
    // Get holiday data
    const docRef = doc(db, COLLECTION_NAME, holidayId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { rescheduledCount: 0, error: 'Holiday not found' };
    }
    
    const holiday = {
      id: docSnap.id,
      ...docSnap.data(),
      date: docSnap.data().date?.toDate() || new Date(),
    } as Holiday;
    
    // Import reschedule service
    const { rescheduleClassesForDeletedHoliday: doReschedule } = await import('./reschedule');
    const rescheduledCount = await doReschedule(holiday);
    
    return { rescheduledCount };
  } catch (error) {
    console.error('Error rescheduling classes:', error);
    return { rescheduledCount: 0, error: 'Failed to reschedule classes' };
  }
}