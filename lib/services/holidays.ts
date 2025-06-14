/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  collection, 
  doc, 
  getDocs, 
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
    console.log('Getting holidays for year:', year);
    
    // Get all holidays first
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    console.log('Total holidays in collection:', querySnapshot.size);
    
    // Filter by year in memory
    const holidays = querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        console.log('Processing holiday:', doc.id, data);
        
        let date: Date;
        if (data.date?.toDate) {
          date = data.date.toDate();
        } else if (data.date) {
          date = new Date(data.date);
        } else {
          date = new Date();
        }
        
        return {
          id: doc.id,
          name: data.name || '',
          date: date,
          type: data.type || 'national',
          branches: data.branches || [],
          description: data.description || ''
        } as Holiday;
      })
      .filter(holiday => {
        const holidayYear = holiday.date.getFullYear();
        console.log(`Holiday "${holiday.name}" year: ${holidayYear}, target year: ${year}`);
        return holidayYear === year;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    console.log('Filtered holidays for year', year, ':', holidays);
    
    return holidays;
  } catch (error) {
    console.error('Error getting holidays:', error);
    // Return empty array instead of throwing to prevent page crash
    return [];
  }
}

// Alternative: Get all holidays without date filter for debugging
export async function getAllHolidays(): Promise<Holiday[]> {
  try {
    console.log('Getting ALL holidays from collection:', COLLECTION_NAME);
    
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    console.log('Total documents in holidays collection:', querySnapshot.size);
    
    const holidays = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Holiday document:', {
        id: doc.id,
        data: data,
        dateType: typeof data.date,
        dateValue: data.date
      });
      
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
      } as Holiday;
    });
    
    return holidays;
  } catch (error) {
    console.error('Error getting all holidays:', error);
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
  holidayData: Omit<Holiday, 'id'>
): Promise<{ id: string }> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...holidayData,
      date: Timestamp.fromDate(holidayData.date),
    });
    
    return { id: docRef.id };
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
    
    // Build update object without id field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    
    Object.entries(holidayData).forEach(([key, value]) => {
      if (key !== 'id') {
        if (key === 'date' && value instanceof Date) {
          updateData[key] = Timestamp.fromDate(value);
        } else {
          updateData[key] = value;
        }
      }
    });
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating holiday:', error);
    throw error;
  }
}

// Delete holiday
export async function deleteHoliday(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
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