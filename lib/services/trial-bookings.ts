// lib/services/trial-bookings.ts

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
  deleteDoc,
  deleteField
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { TrialBooking, TrialSession } from '@/types/models';
import { checkParentPhoneExists } from './parents';

const BOOKINGS_COLLECTION = 'trialBookings';
const SESSIONS_COLLECTION = 'trialSessions';

// ==================== Trial Bookings ====================

// Get all trial bookings
export async function getTrialBookings(): Promise<TrialBooking[]> {
  try {
    const q = query(
      collection(db, BOOKINGS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate(),
      contactedAt: doc.data().contactedAt?.toDate(),
    } as TrialBooking));
  } catch (error) {
    console.error('Error getting trial bookings:', error);
    throw error;
  }
}

// Get trial bookings by status
export async function getTrialBookingsByStatus(status: TrialBooking['status']): Promise<TrialBooking[]> {
  try {
    const q = query(
      collection(db, BOOKINGS_COLLECTION),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate(),
      contactedAt: doc.data().contactedAt?.toDate(),
    } as TrialBooking));
  } catch (error) {
    console.error('Error getting trial bookings by status:', error);
    throw error;
  }
}

// Get single trial booking
export async function getTrialBooking(id: string): Promise<TrialBooking | null> {
  try {
    const docRef = doc(db, BOOKINGS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        contactedAt: data.contactedAt?.toDate(),
      } as TrialBooking;
    }
    return null;
  } catch (error) {
    console.error('Error getting trial booking:', error);
    throw error;
  }
}

// Create trial booking
export async function createTrialBooking(
  data: Omit<TrialBooking, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, BOOKINGS_COLLECTION), {
      ...data,
      status: data.status || 'new',
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating trial booking:', error);
    throw error;
  }
}

// Update trial booking
export async function updateTrialBooking(
  id: string,
  data: Partial<TrialBooking>
): Promise<void> {
  try {
    const docRef = doc(db, BOOKINGS_COLLECTION, id);
    
    // Remove fields that shouldn't be updated
    const updateData: any = { ...data };
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    // Convert Date objects to Timestamps
    if (updateData.contactedAt instanceof Date) {
      updateData.contactedAt = Timestamp.fromDate(updateData.contactedAt);
    }
    
    // Add server timestamp for updatedAt
    updateData.updatedAt = serverTimestamp();
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating trial booking:', error);
    throw error;
  }
}

// Update booking status
export async function updateBookingStatus(
  id: string,
  status: TrialBooking['status'],
  note?: string
): Promise<void> {
  try {
    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
    };
    
    if (status === 'contacted') {
      updateData.contactedAt = serverTimestamp();
    }
    
    if (note) {
      updateData.contactNote = note;
    }
    
    const docRef = doc(db, BOOKINGS_COLLECTION, id);
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
}

// ==================== Trial Sessions ====================

// Get all trial sessions
export async function getTrialSessions(): Promise<TrialSession[]> {
  try {
    const q = query(
      collection(db, SESSIONS_COLLECTION),
      orderBy('scheduledDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledDate: doc.data().scheduledDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      completedAt: doc.data().completedAt?.toDate(),
    } as TrialSession));
  } catch (error) {
    console.error('Error getting trial sessions:', error);
    throw error;
  }
}

// Get trial sessions by booking
export async function getTrialSessionsByBooking(bookingId: string): Promise<TrialSession[]> {
  try {
    const q = query(
      collection(db, SESSIONS_COLLECTION),
      where('bookingId', '==', bookingId),
      orderBy('scheduledDate', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Convert rescheduleHistory dates if exists
      let rescheduleHistory = data.rescheduleHistory;
      if (rescheduleHistory && Array.isArray(rescheduleHistory)) {
        rescheduleHistory = rescheduleHistory.map((history: any) => ({
          ...history,
          originalDate: history.originalDate?.toDate ? history.originalDate.toDate() : history.originalDate,
          newDate: history.newDate?.toDate ? history.newDate.toDate() : history.newDate,
          rescheduledAt: history.rescheduledAt?.toDate ? history.rescheduledAt.toDate() : history.rescheduledAt
        }));
      }
      
      return {
        id: doc.id,
        ...data,
        scheduledDate: data.scheduledDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate(),
        rescheduleHistory
      } as TrialSession;
    });
  } catch (error) {
    console.error('Error getting trial sessions by booking:', error);
    throw error;
  }
}

// Get single trial session
export async function getTrialSession(id: string): Promise<TrialSession | null> {
  try {
    const docRef = doc(db, SESSIONS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Convert rescheduleHistory dates if exists
      let rescheduleHistory = data.rescheduleHistory;
      if (rescheduleHistory && Array.isArray(rescheduleHistory)) {
        rescheduleHistory = rescheduleHistory.map((history: any) => ({
          ...history,
          originalDate: history.originalDate?.toDate ? history.originalDate.toDate() : history.originalDate,
          newDate: history.newDate?.toDate ? history.newDate.toDate() : history.newDate,
          rescheduledAt: history.rescheduledAt?.toDate ? history.rescheduledAt.toDate() : history.rescheduledAt
        }));
      }
      
      return {
        id: docSnap.id,
        ...data,
        scheduledDate: data.scheduledDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate(),
        rescheduleHistory
      } as TrialSession;
    }
    return null;
  } catch (error) {
    console.error('Error getting trial session:', error);
    throw error;
  }
}

// Create trial session
export async function createTrialSession(
  data: Omit<TrialSession, 'id' | 'createdAt'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), {
      ...data,
      scheduledDate: Timestamp.fromDate(data.scheduledDate),
      status: data.status || 'scheduled',
      createdAt: serverTimestamp(),
    });
    
    // Update booking status to scheduled if needed
    const booking = await getTrialBooking(data.bookingId);
    if (booking && booking.status === 'new') {
      await updateBookingStatus(data.bookingId, 'scheduled');
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating trial session:', error);
    throw error;
  }
}

// Update trial session
export async function updateTrialSession(
  id: string,
  data: Partial<TrialSession>
): Promise<void> {
  try {
    const docRef = doc(db, SESSIONS_COLLECTION, id);
    
    const updateData: any = { ...data };
    delete updateData.id;
    delete updateData.createdAt;
    
    if (data.scheduledDate) {
      updateData.scheduledDate = Timestamp.fromDate(data.scheduledDate);
    }
    
    if (data.status === 'attended' || data.status === 'absent') {
      updateData.completedAt = serverTimestamp();
    }
    
    await updateDoc(docRef, updateData);
    
    // Auto-update booking status based on all sessions
    if (data.status === 'attended' || data.status === 'absent' || data.status === 'cancelled') {
      const session = await getTrialSession(id);
      if (session) {
        await checkAndUpdateBookingStatus(session.bookingId);
      }
    }
  } catch (error) {
    console.error('Error updating trial session:', error);
    throw error;
  }
}

// Helper function to check and update booking status
async function checkAndUpdateBookingStatus(bookingId: string): Promise<void> {
  try {
    const [booking, sessions] = await Promise.all([
      getTrialBooking(bookingId),
      getTrialSessionsByBooking(bookingId)
    ]);
    
    if (!booking || sessions.length === 0) return;
    
    // Check if any session has been converted
    const hasConverted = sessions.some(s => s.converted);
    if (hasConverted && booking.status !== 'converted') {
      await updateBookingStatus(bookingId, 'converted');
      return;
    }
    
    // Check if all sessions are completed (attended, absent, cancelled, or converted)
    const allCompleted = sessions.every(s => 
      s.status === 'attended' || 
      s.status === 'absent' || 
      s.status === 'cancelled' || 
      s.converted
    );
    
    // Check if at least one session was attended
    const hasAttended = sessions.some(s => s.status === 'attended');
    
    if (allCompleted && hasAttended && booking.status !== 'completed' && booking.status !== 'converted') {
      await updateBookingStatus(bookingId, 'completed');
    }
  } catch (error) {
    console.error('Error checking and updating booking status:', error);
  }
}

// Cancel trial session
export async function cancelTrialSession(id: string, reason?: string): Promise<void> {
  try {
    await updateTrialSession(id, {
      status: 'cancelled',
      feedback: reason,
    });
  } catch (error) {
    console.error('Error cancelling trial session:', error);
    throw error;
  }
}

// Delete trial session
export async function deleteTrialSession(id: string): Promise<void> {
  try {
    const docRef = doc(db, SESSIONS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting trial session:', error);
    throw error;
  }
}

// Reschedule trial session with history tracking
export async function rescheduleTrialSession(
  sessionId: string,
  newSchedule: {
    scheduledDate: Date;
    startTime: string;
    endTime: string;
    teacherId: string;
    branchId: string;
    roomId: string;
    roomName?: string;
  },
  reason?: string,
  rescheduledBy: string = 'admin'
): Promise<void> {
  try {
    // Get current session data
    const currentSession = await getTrialSession(sessionId);
    if (!currentSession) {
      throw new Error('Trial session not found');
    }
    
    // Prepare reschedule history entry
    const historyEntry = {
      originalDate: currentSession.scheduledDate,
      originalTime: `${currentSession.startTime}-${currentSession.endTime}`,
      newDate: newSchedule.scheduledDate,
      newTime: `${newSchedule.startTime}-${newSchedule.endTime}`,
      reason: reason || 'ไม่มาเรียนตามนัด',
      rescheduledBy,
      rescheduledAt: new Date()
    };
    
    // Build update data
    const updateData: any = {
      ...newSchedule,
      scheduledDate: Timestamp.fromDate(newSchedule.scheduledDate),
      // Reset attendance status
      status: 'scheduled',
      attended: false,
      feedback: '',
      teacherNote: '',
      // Clear interested level using deleteField
      interestedLevel: deleteField(),
      // Add to reschedule history
      rescheduleHistory: [...(currentSession.rescheduleHistory || []), historyEntry]
    };
    
    // Update the session
    const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
    await updateDoc(docRef, updateData);
    
    // Also update booking status back to scheduled if needed
    const booking = await getTrialBooking(currentSession.bookingId);
    if (booking && booking.status === 'completed') {
      await updateBookingStatus(currentSession.bookingId, 'scheduled');
    }
  } catch (error) {
    console.error('Error rescheduling trial session:', error);
    throw error;
  }
}

// Check room availability for trial
export async function checkTrialRoomAvailability(
  branchId: string,
  roomId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeSessionId?: string
): Promise<{
  available: boolean;
  conflicts?: Array<{
    type: 'class' | 'trial' | 'makeup';
    name: string;
    startTime: string;
    endTime: string;
  }>;
}> {
  try {
    console.log('Checking room availability for:', { branchId, roomId, date, startTime, endTime });
    
    const conflicts: Array<{
      type: 'class' | 'trial' | 'makeup';
      name: string;
      startTime: string;
      endTime: string;
    }> = [];
    
    // 1. Check regular classes on that day
    const dayOfWeek = date.getDay();
    const { getClasses } = await import('./classes');
    const classes = await getClasses();
    
    // Create date without time for comparison
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    // Filter classes for the same branch, room, and day
    const relevantClasses = classes.filter(cls => 
      cls.branchId === branchId &&
      cls.roomId === roomId &&
      cls.daysOfWeek.includes(dayOfWeek) &&
      (cls.status === 'published' || cls.status === 'started') &&
      new Date(cls.startDate) <= dateOnly &&
      new Date(cls.endDate) >= dateOnly
    );
    
    console.log(`Found ${relevantClasses.length} relevant classes`);
    
    // Check time conflicts for each class
    for (const cls of relevantClasses) {
      // Check if the class has a session on this specific date
      const schedulesRef = collection(db, 'classes', cls.id, 'schedules');
      
      // Create start and end of day for query
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const scheduleQuery = query(
        schedulesRef,
        where('sessionDate', '>=', Timestamp.fromDate(startOfDay)),
        where('sessionDate', '<=', Timestamp.fromDate(endOfDay)),
        where('status', '!=', 'cancelled')
      );
      const scheduleSnapshot = await getDocs(scheduleQuery);
      
      console.log(`Class ${cls.name} has ${scheduleSnapshot.size} sessions on this date`);
      
      if (!scheduleSnapshot.empty) {
        // Check time overlap
        if (startTime < cls.endTime && endTime > cls.startTime) {
          console.log(`Time conflict with class ${cls.name}: ${cls.startTime}-${cls.endTime} vs ${startTime}-${endTime}`);
          conflicts.push({
            type: 'class',
            name: cls.name,
            startTime: cls.startTime,
            endTime: cls.endTime,
          });
        }
      }
    }
    
    // 2. Check makeup classes
    const { getMakeupClasses } = await import('./makeup');
    const makeupClasses = await getMakeupClasses();
    
    // Filter makeup classes for the same branch, room, and date
    const relevantMakeups = makeupClasses.filter(makeup => 
      makeup.status === 'scheduled' &&
      makeup.makeupSchedule &&
      makeup.makeupSchedule.branchId === branchId &&
      makeup.makeupSchedule.roomId === roomId &&
      new Date(makeup.makeupSchedule.date).toDateString() === date.toDateString()
    );
    
    console.log(`Found ${relevantMakeups.length} relevant makeup classes`);
    
    // Check time conflicts for makeup classes
    for (const makeup of relevantMakeups) {
      if (makeup.makeupSchedule) {
        // Check time overlap
        if (startTime < makeup.makeupSchedule.endTime && endTime > makeup.makeupSchedule.startTime) {
          const { getStudent } = await import('./parents');
          const student = await getStudent(makeup.parentId, makeup.studentId);
          console.log(`Time conflict with makeup class for ${student?.name}`);
          conflicts.push({
            type: 'makeup',
            name: `${student?.nickname || student?.name || 'Unknown'}`,
            startTime: makeup.makeupSchedule.startTime,
            endTime: makeup.makeupSchedule.endTime,
          });
        }
      }
    }
    
    // 3. Check other trial sessions
    const q = query(
      collection(db, SESSIONS_COLLECTION),
      where('branchId', '==', branchId),
      where('roomId', '==', roomId),
      where('scheduledDate', '==', Timestamp.fromDate(date)),
      where('status', '!=', 'cancelled')
    );
    
    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.size} trial sessions`);
    
    for (const doc of querySnapshot.docs) {
      if (doc.id === excludeSessionId) continue;
      
      const session = doc.data() as TrialSession;
      // Check time overlap
      if (startTime < session.endTime && endTime > session.startTime) {
        console.log(`Time conflict with trial session for ${session.studentName}`);
        conflicts.push({
          type: 'trial',
          name: session.studentName,
          startTime: session.startTime,
          endTime: session.endTime,
        });
      }
    }
    
    console.log(`Total conflicts found: ${conflicts.length}`);
    return {
      available: conflicts.length === 0,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };
  } catch (error) {
    console.error('Error checking room availability:', error);
    return { available: false };
  }
}

// Convert trial to enrollment
export async function convertTrialToEnrollment(
  bookingId: string,
  sessionId: string,
  classId: string,
  pricing: {
    originalPrice: number;
    discount: number;
    discountType: 'percentage' | 'fixed';
    finalPrice: number;
    promotionCode?: string;
  }
): Promise<{
  parentId: string;
  studentId: string;
  enrollmentId: string;
}> {
  try {
    // Get booking and session data
    const [booking, session] = await Promise.all([
      getTrialBooking(bookingId),
      getTrialSession(sessionId),
    ]);
    
    if (!booking || !session) {
      throw new Error('Booking or session not found');
    }
    
    // Find the student data from booking
    const studentData = booking.students.find(s => s.name === session.studentName);
    if (!studentData) {
      throw new Error('Student not found in booking');
    }
    
    // Import required services
    const { createParent, createStudent } = await import('./parents');
    const { createEnrollment } = await import('./enrollments');
    const { getClass } = await import('./classes');
    
    // Check if parent exists by phone
    let parentId: string;
    const { checkParentPhoneExists } = await import('./parents');
    const parentExists = await checkParentPhoneExists(booking.parentPhone);
    
    if (parentExists) {
      // If phone exists, we need to find the parent
      // For now, we'll create new parent (in real app, might want to handle differently)
      throw new Error('Phone number already exists. Please handle this case.');
    } else {
      // Create new parent
      parentId = await createParent({
        displayName: booking.parentName,
        phone: booking.parentPhone,
        email: booking.parentEmail,
      });
    }
    
    // Create student
    const studentId = await createStudent(parentId, {
      name: studentData.name,
      nickname: studentData.name.split(' ')[0], // Use first name as nickname
      birthdate: new Date(), // This should be collected during trial booking
      gender: 'M', // This should be collected during trial booking
      schoolName: studentData.schoolName,
      gradeLevel: studentData.gradeLevel,
      isActive: true,
    });
    
    // Get class data for branch ID
    const classData = await getClass(classId);
    if (!classData) {
      throw new Error('Class not found');
    }
    
    // Create enrollment
    const enrollmentId = await createEnrollment({
      studentId,
      classId,
      parentId,
      branchId: classData.branchId,
      status: 'active',
      pricing,
      payment: {
        method: 'cash',
        status: 'pending',
        paidAmount: 0,
      },
    });
    
    // Update trial session as converted
    await updateTrialSession(sessionId, {
      converted: true,
      convertedToClassId: classId,
      conversionNote: `Converted to ${classData.name}`,
    });
    
    // Check and update booking status
    await checkAndUpdateBookingStatus(bookingId);
    
    return { parentId, studentId, enrollmentId };
  } catch (error) {
    console.error('Error converting trial to enrollment:', error);
    throw error;
  }
}

// Get upcoming trial sessions
export async function getUpcomingTrialSessions(
  startDate: Date,
  endDate: Date,
  branchId?: string
): Promise<TrialSession[]> {
  try {
    let q = query(
      collection(db, SESSIONS_COLLECTION),
      where('scheduledDate', '>=', Timestamp.fromDate(startDate)),
      where('scheduledDate', '<=', Timestamp.fromDate(endDate)),
      where('status', '==', 'scheduled'),
      orderBy('scheduledDate', 'asc')
    );
    
    if (branchId) {
      q = query(
        collection(db, SESSIONS_COLLECTION),
        where('branchId', '==', branchId),
        where('scheduledDate', '>=', Timestamp.fromDate(startDate)),
        where('scheduledDate', '<=', Timestamp.fromDate(endDate)),
        where('status', '==', 'scheduled'),
        orderBy('scheduledDate', 'asc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledDate: doc.data().scheduledDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      completedAt: doc.data().completedAt?.toDate(),
    } as TrialSession));
  } catch (error) {
    console.error('Error getting upcoming trial sessions:', error);
    throw error;
  }
}

// Delete trial booking (only for new or cancelled bookings)
export async function deleteTrialBooking(id: string): Promise<void> {
  try {
    // Get booking to check status
    const booking = await getTrialBooking(id);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    // Only allow deletion for new or cancelled bookings
    if (booking.status !== 'new' && booking.status !== 'cancelled') {
      throw new Error('Can only delete new or cancelled bookings');
    }
    
    // Delete all associated trial sessions first
    const sessions = await getTrialSessionsByBooking(id);
    const batch = writeBatch(db);
    
    // Delete all sessions
    for (const session of sessions) {
      const sessionRef = doc(db, SESSIONS_COLLECTION, session.id);
      batch.delete(sessionRef);
    }
    
    // Delete the booking
    const bookingRef = doc(db, BOOKINGS_COLLECTION, id);
    batch.delete(bookingRef);
    
    // Commit the batch
    await batch.commit();
  } catch (error) {
    console.error('Error deleting trial booking:', error);
    throw error;
  }
}

// Get trial booking stats
export async function getTrialBookingStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  conversionRate: number;
  bySource: Record<string, number>;
}> {
  try {
    const bookings = await getTrialBookings();
    
    const stats = {
      total: bookings.length,
      byStatus: {} as Record<string, number>,
      conversionRate: 0,
      bySource: {} as Record<string, number>,
    };
    
    // Count by status and source
    bookings.forEach(booking => {
      // By status
      stats.byStatus[booking.status] = (stats.byStatus[booking.status] || 0) + 1;
      
      // By source
      stats.bySource[booking.source] = (stats.bySource[booking.source] || 0) + 1;
    });
    
    // Calculate conversion rate
    const converted = stats.byStatus['converted'] || 0;
    const completed = stats.byStatus['completed'] || 0;
    if (completed > 0) {
      stats.conversionRate = (converted / completed) * 100;
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting trial booking stats:', error);
    return {
      total: 0,
      byStatus: {},
      conversionRate: 0,
      bySource: {},
    };
  }
}