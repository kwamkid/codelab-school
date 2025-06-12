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
export async function addHoliday(holidayData: Omit<Holiday, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...holidayData,
      date: Timestamp.fromDate(holidayData.date),
    });
    
    // If it's a recurring holiday, create for future years
    if (holidayData.isRecurring) {
      await createRecurringHolidays(holidayData, docRef.id);
    }
    
    return docRef.id;
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
export async function deleteHoliday(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error('Error deleting holiday:', error);
    throw error;
  }
}

// Create recurring holidays for future years
async function createRecurringHolidays(
  holidayData: Omit<Holiday, 'id'>,
  originalId: string
): Promise<void> {
  try {
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 2; // Create for next 2 years
    
    for (let year = currentYear + 1; year <= maxYear; year++) {
      const newDate = new Date(holidayData.date);
      newDate.setFullYear(year);
      
      // Check if holiday already exists for this date
      const exists = await checkHolidayExists(newDate, holidayData.name);
      if (!exists) {
        await addDoc(collection(db, COLLECTION_NAME), {
          ...holidayData,
          date: Timestamp.fromDate(newDate),
          recurringFromId: originalId,
        });
      }
    }
  } catch (error) {
    console.error('Error creating recurring holidays:', error);
  }
}

// Check if holiday exists
async function checkHolidayExists(date: Date, name: string): Promise<boolean> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay)),
      where('name', '==', name)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
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
    
    // Check if any holiday is school closed
    return holidays.some(holiday => holiday.isSchoolClosed);
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