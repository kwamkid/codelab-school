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
// Get all trial bookings
export async function getTrialBookings(branchId?: string | null): Promise<TrialBooking[]> {
  try {
    let bookingQuery;
    
    if (branchId) {
      bookingQuery = query(
        collection(db, BOOKINGS_COLLECTION),
        where('branchId', '==', branchId),
        orderBy('createdAt', 'desc')
      );
    } else {
      bookingQuery = query(
        collection(db, BOOKINGS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(bookingQuery);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        source: data.source,
        hasLineLogin: data.hasLineLogin,
        parentLineId: data.parentLineId,
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        parentEmail: data.parentEmail,
        students: data.students,
        branchId: data.branchId, // เพิ่มบรรทัดนี้
        status: data.status,
        contactNote: data.contactNote,
        bookedBy: data.bookedBy,
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        contactedAt: data.contactedAt?.toDate(),
      } as TrialBooking;
    });
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
    // ทำความสะอาดข้อมูลก่อนบันทึก
    const cleanedData: any = {
      ...data,
      status: data.status || 'new',
      createdAt: serverTimestamp(),
    };
    
    // ทำความสะอาดข้อมูลนักเรียน
    if (cleanedData.students && Array.isArray(cleanedData.students)) {
      cleanedData.students = cleanedData.students.map((student: any) => {
        const cleanStudent: any = {
          name: student.name,
          subjectInterests: student.subjectInterests || []
        };
        
        // เพิ่มเฉพาะ field ที่มีค่า
        if (student.schoolName) {
          cleanStudent.schoolName = student.schoolName;
        }
        if (student.gradeLevel) {
          cleanStudent.gradeLevel = student.gradeLevel;
        }
        
        return cleanStudent;
      });
    }
    
    const docRef = await addDoc(collection(db, BOOKINGS_COLLECTION), cleanedData);
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
export async function getTrialSessions(branchId?: string | null): Promise<TrialSession[]> {
  try {
    let sessionQuery;
    
    if (branchId) {
      sessionQuery = query(
        collection(db, SESSIONS_COLLECTION),
        where('branchId', '==', branchId),
        orderBy('scheduledDate', 'desc')
      );
    } else {
      sessionQuery = query(
        collection(db, SESSIONS_COLLECTION),
        orderBy('scheduledDate', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(sessionQuery);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any; // Type assertion to any
      
      // Convert rescheduleHistory dates if exists
      let rescheduleHistory = data.rescheduleHistory;
      if (rescheduleHistory && Array.isArray(rescheduleHistory)) {
        rescheduleHistory = rescheduleHistory.map((history: any) => ({
          originalDate: history.originalDate?.toDate ? history.originalDate.toDate() : history.originalDate,
          originalTime: history.originalTime,
          newDate: history.newDate?.toDate ? history.newDate.toDate() : history.newDate,
          newTime: history.newTime,
          reason: history.reason,
          rescheduledBy: history.rescheduledBy,
          rescheduledAt: history.rescheduledAt?.toDate ? history.rescheduledAt.toDate() : history.rescheduledAt
        }));
      }
      
      return {
        id: doc.id,
        bookingId: data.bookingId,
        studentName: data.studentName,
        subjectId: data.subjectId,
        branchId: data.branchId,
        scheduledDate: data.scheduledDate?.toDate() || new Date(),
        startTime: data.startTime,
        endTime: data.endTime,
        teacherId: data.teacherId,
        roomId: data.roomId,
        roomName: data.roomName,
        status: data.status,
        attended: data.attended,
        feedback: data.feedback,
        interestedLevel: data.interestedLevel,
        teacherNote: data.teacherNote,
        converted: data.converted,
        convertedToClassId: data.convertedToClassId,
        conversionNote: data.conversionNote,
        rescheduleHistory: rescheduleHistory,
        createdAt: data.createdAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate(),
      } as TrialSession;
    });
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

// Check room availability for trial with comprehensive checks
export async function checkTrialRoomAvailability(
  branchId: string,
  roomId: string,
  date: Date,
  startTime: string,
  endTime: string,
  teacherId: string,
  excludeSessionId?: string
): Promise<{
  available: boolean;
  conflicts?: Array<{
    type: 'holiday' | 'room_conflict' | 'teacher_conflict';
    message: string;
    details?: any;
  }>;
}> {
  try {
    // Use centralized availability checker
    const { checkAvailability } = await import('../utils/availability');
    
    const result = await checkAvailability({
      date,
      startTime,
      endTime,
      branchId,
      roomId,
      teacherId,
      excludeId: excludeSessionId,
      excludeType: 'trial'
    });
    
    return {
      available: result.available,
      conflicts: result.available ? undefined : result.reasons
    };
  } catch (error) {
    console.error('Error checking room availability:', error);
    return { 
      available: false,
      conflicts: [{
        type: 'room_conflict',
        message: 'เกิดข้อผิดพลาดในการตรวจสอบ'
      }]
    };
  }
}

// lib/services/trial-bookings.ts
// (แสดงเฉพาะส่วนที่ต้องแก้ไข - ค้นหาฟังก์ชัน convertTrialToEnrollment และแทนที่ด้วยโค้ดนี้)

// Convert trial to enrollment with enhanced data
export async function convertTrialToEnrollment(
  bookingId: string,
  sessionId: string,
  conversionData: {
    // Parent info
    useExistingParent?: boolean;
    existingParentId?: string;
    parentName: string;
    parentPhone: string;
    parentEmail?: string;
    emergencyPhone?: string;
    address?: {
      houseNumber: string;
      street?: string;
      subDistrict: string;
      district: string;
      province: string;
      postalCode: string;
    };
    
    // Student info
    useExistingStudent?: boolean;
    existingStudentId?: string;
    studentName?: string;
    studentNickname?: string;
    studentBirthdate?: Date;
    studentGender?: 'M' | 'F';
    studentSchoolName?: string;
    studentGradeLevel?: string;
    studentAllergies?: string;
    studentSpecialNeeds?: string;
    emergencyContact?: string;
    emergencyContactPhone?: string;
    
    // Class and pricing
    classId: string;
    pricing: {
      originalPrice: number;
      discount: number;
      discountType: 'percentage' | 'fixed';
      finalPrice: number;
      promotionCode?: string;
    };
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
    
    // Import required services
    const { createParent, createStudent } = await import('./parents');
    const { createEnrollment, checkDuplicateEnrollment, checkAvailableSeats } = await import('./enrollments');
    const { getClass } = await import('./classes');
    
    let parentId: string;
    let studentId: string;
    
    // Handle parent
    if (conversionData.useExistingParent && conversionData.existingParentId) {
      parentId = conversionData.existingParentId;
    } else {
      // Create new parent
      const parentData: any = {
        displayName: conversionData.parentName,
        phone: conversionData.parentPhone,
        email: conversionData.parentEmail,
        preferredBranchId: session.branchId,
      };
      
      if (conversionData.emergencyPhone) {
        parentData.emergencyPhone = conversionData.emergencyPhone;
      }
      
      if (conversionData.address) {
        parentData.address = conversionData.address;
      }
      
      parentId = await createParent(parentData);
    }
    
    // Handle student
    if (conversionData.useExistingStudent && conversionData.existingStudentId) {
      studentId = conversionData.existingStudentId;
    } else {
      // Create new student
      if (!conversionData.studentName || !conversionData.studentNickname || !conversionData.studentBirthdate || !conversionData.studentGender) {
        throw new Error('Missing required student information');
      }
      
      studentId = await createStudent(parentId, {
        name: conversionData.studentName,
        nickname: conversionData.studentNickname,
        birthdate: conversionData.studentBirthdate,
        gender: conversionData.studentGender,
        schoolName: conversionData.studentSchoolName,
        gradeLevel: conversionData.studentGradeLevel,
        allergies: conversionData.studentAllergies,
        specialNeeds: conversionData.studentSpecialNeeds,
        emergencyContact: conversionData.emergencyContact,
        emergencyPhone: conversionData.emergencyContactPhone,
        isActive: true,
      });
    }
    
    // Check for duplicate enrollment
    const isDuplicate = await checkDuplicateEnrollment(studentId, conversionData.classId);
    if (isDuplicate) {
      throw new Error('นักเรียนได้ลงทะเบียนในคลาสนี้แล้ว');
    }
    
    // Check available seats
    const seatsInfo = await checkAvailableSeats(conversionData.classId);
    if (!seatsInfo.available) {
      throw new Error(`คลาสเต็มแล้ว (${seatsInfo.currentEnrolled}/${seatsInfo.maxStudents})`);
    }
    
    // Get class data for branch ID
    const classData = await getClass(conversionData.classId);
    if (!classData) {
      throw new Error('Class not found');
    }
    
    // Create enrollment
    const enrollmentId = await createEnrollment({
      studentId,
      classId: conversionData.classId,
      parentId,
      branchId: classData.branchId,
      status: 'active',
      pricing: conversionData.pricing,
      payment: {
        method: 'cash',
        status: 'pending',
        paidAmount: 0,
      },
    });
    
    // Update trial session as converted
    await updateTrialSession(sessionId, {
      converted: true,
      convertedToClassId: conversionData.classId,
      conversionNote: `Converted to ${classData.name}`,
    });
    
    // Check and update booking status
    await checkAndUpdateBookingStatus(bookingId);
    
    // Log conversion for tracking
    console.log('Trial conversion successful:', {
      bookingId,
      sessionId,
      parentId,
      studentId,
      enrollmentId,
      classId: conversionData.classId,
      useExistingParent: conversionData.useExistingParent,
      useExistingStudent: conversionData.useExistingStudent,
    });
    
    return { parentId, studentId, enrollmentId };
  } catch (error) {
    console.error('Error converting trial to enrollment:', error);
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
export async function getTrialBookingStats(branchId?: string | null): Promise<{
  total: number;
  byStatus: Record<string, number>;
  conversionRate: number;
  bySource: Record<string, number>;
}> {
  try {
    const bookings = await getTrialBookings(branchId); // ส่ง branchId ไปด้วย
    
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