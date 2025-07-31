import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch,
  increment,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Enrollment, Class } from '@/types/models';
import { getClassSchedules } from './classes';
import { createMakeupRequest } from './makeup';
import { getClass } from './classes';

const COLLECTION_NAME = 'enrollments';

// Get all enrollments
export async function getEnrollments(branchId?: string): Promise<Enrollment[]> {
  try {
    let constraints: any[] = [orderBy('enrolledAt', 'desc')];
    
    // Add branch filter if provided
    if (branchId) {
      constraints.unshift(where('branchId', '==', branchId));
    }
    
    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      enrolledAt: doc.data().enrolledAt?.toDate() || new Date(),
      payment: {
        ...doc.data().payment,
        paidDate: doc.data().payment?.paidDate?.toDate()
      }
    } as Enrollment));
  } catch (error) {
    console.error('Error getting enrollments:', error);
    throw error;
  }
}

// Get enrollments by class
export async function getEnrollmentsByClass(classId: string): Promise<Enrollment[]> {
  try {
    // Simplified query - just filter by classId first
    const q = query(
      collection(db, COLLECTION_NAME),
      where('classId', '==', classId)
    );
    const querySnapshot = await getDocs(q);
    
    // Filter in memory for active and completed status
    const enrollments = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        enrolledAt: doc.data().enrolledAt?.toDate() || new Date(),
        payment: {
          ...doc.data().payment,
          paidDate: doc.data().payment?.paidDate?.toDate()
        }
      } as Enrollment))
      .filter(enrollment => enrollment.status === 'active' || enrollment.status === 'completed')
      .sort((a, b) => a.enrolledAt.getTime() - b.enrolledAt.getTime());
    
    return enrollments;
  } catch (error) {
    console.error('Error getting enrollments by class:', error);
    throw error;
  }
}

// Get enrollments by student
export async function getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
  try {
    const q = query(
      collection(db, 'enrollments'),
      where('studentId', '==', studentId),
      where('status', 'in', ['active', 'completed'])
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      enrolledAt: doc.data().enrolledAt?.toDate() || new Date(),
      payment: {
        ...doc.data().payment,
        paidDate: doc.data().payment?.paidDate?.toDate()
      },
      transferHistory: doc.data().transferHistory?.map((th: any) => ({
        ...th,
        transferredAt: th.transferredAt?.toDate() || new Date()
      }))
    } as Enrollment));
  } catch (error) {
    console.error('Error getting enrollments by student:', error);
    return [];
  }
}

// Get enrollments by parent
export async function getEnrollmentsByParent(parentId: string): Promise<Enrollment[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('parentId', '==', parentId),
      orderBy('enrolledAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      enrolledAt: doc.data().enrolledAt?.toDate() || new Date(),
      payment: {
        ...doc.data().payment,
        paidDate: doc.data().payment?.paidDate?.toDate()
      }
    } as Enrollment));
  } catch (error) {
    console.error('Error getting enrollments by parent:', error);
    throw error;
  }
}

// Get enrollments by branch
export async function getEnrollmentsByBranch(branchId: string): Promise<Enrollment[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('branchId', '==', branchId),
      orderBy('enrolledAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      enrolledAt: doc.data().enrolledAt?.toDate() || new Date(),
      payment: {
        ...doc.data().payment,
        paidDate: doc.data().payment?.paidDate?.toDate()
      }
    } as Enrollment));
  } catch (error) {
    console.error('Error getting enrollments by branch:', error);
    return [];
  }
}

// Get single enrollment
export async function getEnrollment(id: string): Promise<Enrollment | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        enrolledAt: data.enrolledAt?.toDate() || new Date(),
        payment: {
          ...data.payment,
          paidDate: data.payment?.paidDate?.toDate()
        }
      } as Enrollment;
    }
    return null;
  } catch (error) {
    console.error('Error getting enrollment:', error);
    throw error;
  }
}

// Check if student is already enrolled in class
export async function checkDuplicateEnrollment(
  studentId: string,
  classId: string
): Promise<boolean> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentId),
      where('classId', '==', classId)
    );
    const querySnapshot = await getDocs(q);
    
    // Filter in memory for active/completed status
    const activeEnrollments = querySnapshot.docs.filter(doc => {
      const status = doc.data().status;
      return status === 'active' || status === 'completed';
    });
    
    return activeEnrollments.length > 0;
  } catch (error) {
    console.error('Error checking duplicate enrollment:', error);
    throw error;
  }
}

// Create new enrollment with atomic update
export async function createEnrollment(
  enrollmentData: Omit<Enrollment, 'id' | 'enrolledAt'>
): Promise<string> {
  try {
    // Use batch write for atomic operation
    const batch = writeBatch(db);
    
    // 1. Create enrollment document
    const enrollmentRef = doc(collection(db, COLLECTION_NAME));
    
    // Build the data object with proper types
    const dataToSave = {
      ...enrollmentData,
      enrolledAt: serverTimestamp(),
      payment: {
        ...enrollmentData.payment,
        ...(enrollmentData.payment.paidDate && {
          paidDate: Timestamp.fromDate(new Date(enrollmentData.payment.paidDate))
        })
      }
    };
    
    // Remove undefined promotionCode if it exists
    if (!dataToSave.pricing.promotionCode) {
      const { promotionCode: _promotionCode, ...pricingWithoutPromo } = dataToSave.pricing;
      dataToSave.pricing = pricingWithoutPromo;
    }
    
    batch.set(enrollmentRef, dataToSave);
    
    // 2. Update class enrolled count
    const classRef = doc(db, 'classes', enrollmentData.classId);
    batch.update(classRef, {
      enrolledCount: increment(1)
    });
    
    // 3. Commit the batch
    await batch.commit();
    
    // 4. Check for missed sessions and create makeup requests
    await createMakeupForMissedSessions(
      enrollmentRef.id,
      enrollmentData.classId,
      enrollmentData.studentId,
      enrollmentData.parentId
    );
    
    return enrollmentRef.id;
  } catch (error) {
    console.error('Error creating enrollment:', error);
    throw error;
  }
}

// เพิ่มฟังก์ชันใหม่
async function createMakeupForMissedSessions(
  enrollmentId: string,
  classId: string,
  studentId: string,
  parentId: string
): Promise<void> {
  try {
    // Get class data
    const classData = await getClass(classId);
    if (!classData) return;
    
    // Get all class schedules
    const schedules = await getClassSchedules(classId);
    
    // Filter missed sessions (sessions that have already passed)
    const now = new Date();
    const missedSchedules = schedules.filter(schedule => {
      const sessionDate = new Date(schedule.sessionDate);
      const [hours, minutes] = classData.endTime.split(':').map(Number);
      sessionDate.setHours(hours, minutes, 0, 0);
      
      return sessionDate < now && 
             schedule.status !== 'cancelled' &&
             schedule.status !== 'rescheduled';
    });
    
    // Create makeup requests for each missed session
    for (const schedule of missedSchedules) {
      try {
        await createMakeupRequest({
          type: 'ad-hoc',
          originalClassId: classId,
          originalScheduleId: schedule.id,
          studentId: studentId,
          parentId: parentId,
          requestDate: new Date(),
          requestedBy: 'system', // ระบุว่าเป็น system auto-create
          reason: 'สมัครเรียนหลังจากคลาสเริ่มแล้ว (Auto-generated)',
          status: 'pending',
          originalSessionNumber: schedule.sessionNumber,
          originalSessionDate: schedule.sessionDate
        });
        
        console.log(`Created makeup request for session ${schedule.sessionNumber}`);
      } catch (error) {
        console.error(`Error creating makeup for session ${schedule.sessionNumber}:`, error);
        // Continue with other sessions even if one fails
      }
    }
    
    // Notify admin if makeup classes were created
    // หลังจากสร้าง makeup requests เสร็จแล้ว
    if (missedSchedules.length > 0) {
      console.log(`Created ${missedSchedules.length} makeup requests for enrollment ${enrollmentId}`);
      
      // Get student and class info for notification
      const { getStudent } = await import('./parents');
      const studentInfo = await getStudent(parentId, studentId);
      
      if (studentInfo && classData) {
        // Send notification to admin
        const { notifyAdminNewMakeup } = await import('./notifications');
        await notifyAdminNewMakeup(
          studentInfo.nickname || studentInfo.name,
          classData.name,
          missedSchedules.length
        );
      }
    }
  } catch (error) {
    console.error('Error creating makeup for missed sessions:', error);
    // Don't throw - this should not break enrollment creation
  }
}

// Update enrollment
export async function updateEnrollment(
  id: string,
  enrollmentData: Partial<Enrollment>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // Build update data with proper types
    const { id: _id, enrolledAt: _enrolledAt, ...dataToUpdate } = enrollmentData;
    
    // Handle payment date conversion separately
    let finalUpdateData: Partial<Enrollment> = dataToUpdate;
    
    if (dataToUpdate.payment?.paidDate) {
      finalUpdateData = {
        ...dataToUpdate,
        payment: {
          ...dataToUpdate.payment,
          paidDate: Timestamp.fromDate(new Date(dataToUpdate.payment.paidDate)) as unknown as Date
        }
      };
    }
    
    await setDoc(docRef, finalUpdateData, { merge: true });
  } catch (error) {
    console.error('Error updating enrollment:', error);
    throw error;
  }
}

// Cancel enrollment (drop student from class)
export async function cancelEnrollment(
  id: string,
  reason: string
): Promise<void> {
  try {
    // Get enrollment data first
    const enrollment = await getEnrollment(id);
    if (!enrollment) throw new Error('Enrollment not found');
    
    // Use batch write for atomic operation
    const batch = writeBatch(db);
    
    // 1. Update enrollment status
    const enrollmentRef = doc(db, COLLECTION_NAME, id);
    batch.update(enrollmentRef, {
      status: 'dropped',
      droppedReason: reason
    });
    
    // 2. Decrease class enrolled count
    const classRef = doc(db, 'classes', enrollment.classId);
    batch.update(classRef, {
      enrolledCount: increment(-1)
    });
    
    // 3. Commit the batch
    await batch.commit();
  } catch (error) {
    console.error('Error canceling enrollment:', error);
    throw error;
  }
}

// Get enrollment statistics
export async function getEnrollmentStats(branchId?: string): Promise<{
  total: number;
  active: number;
  completed: number;
  dropped: number;
  totalRevenue: number;
  pendingPayments: number;
}> {
  try {
    const enrollments = await getEnrollments(branchId);
    
    const stats = enrollments.reduce((acc, enrollment) => {
      acc.total++;
      
      if (enrollment.status === 'active') acc.active++;
      else if (enrollment.status === 'completed') acc.completed++;
      else if (enrollment.status === 'dropped') acc.dropped++;
      
      if (enrollment.payment.status === 'paid') {
        acc.totalRevenue += enrollment.payment.paidAmount;
      } else if (enrollment.payment.status === 'pending') {
        acc.pendingPayments += enrollment.pricing.finalPrice;
      }
      
      return acc;
    }, {
      total: 0,
      active: 0,
      completed: 0,
      dropped: 0,
      totalRevenue: 0,
      pendingPayments: 0
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting enrollment stats:', error);
    return {
      total: 0,
      active: 0,
      completed: 0,
      dropped: 0,
      totalRevenue: 0,
      pendingPayments: 0
    };
  }
}

// Check available seats in class
export async function checkAvailableSeats(classId: string): Promise<{
  available: boolean;
  currentEnrolled: number;
  maxStudents: number;
  availableSeats: number;
}> {
  try {
    const classData = await getClass(classId);
    if (!classData) throw new Error('Class not found');
    
    const availableSeats = classData.maxStudents - classData.enrolledCount;
    
    return {
      available: availableSeats > 0,
      currentEnrolled: classData.enrolledCount,
      maxStudents: classData.maxStudents,
      availableSeats: Math.max(0, availableSeats)
    };
  } catch (error) {
    console.error('Error checking available seats:', error);
    return {
      available: false,
      currentEnrolled: 0,
      maxStudents: 0,
      availableSeats: 0
    };
  }
}

// Transfer enrollment to another class (Updated Version)
export async function transferEnrollment(
  enrollmentId: string,
  newClassId: string,
  reason?: string
): Promise<void> {
  try {
    const enrollment = await getEnrollment(enrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');
    
    // Use batch write for atomic operation
    const batch = writeBatch(db);
    
    // 1. Update enrollment - keep status as 'active' and track transfer history
    const enrollmentRef = doc(db, COLLECTION_NAME, enrollmentId);
    
    const transferRecord = {
      fromClassId: enrollment.classId,
      toClassId: newClassId,
      transferredAt: new Date(),
      reason: reason || 'Admin transfer'
    };
    
    const updatedHistory = enrollment.transferHistory 
      ? [...enrollment.transferHistory, transferRecord]
      : [transferRecord];
    
    batch.update(enrollmentRef, {
      classId: newClassId,
      status: 'active',
      transferHistory: updatedHistory.map(record => ({
        ...record,
        transferredAt: Timestamp.fromDate(new Date(record.transferredAt))
      }))
    });
    
    // 2. Decrease old class enrolled count
    const oldClassRef = doc(db, 'classes', enrollment.classId);
    batch.update(oldClassRef, {
      enrolledCount: increment(-1)
    });
    
    // 3. Increase new class enrolled count
    const newClassRef = doc(db, 'classes', newClassId);
    batch.update(newClassRef, {
      enrolledCount: increment(1)
    });
    
    // 4. Commit the batch
    await batch.commit();
  } catch (error) {
    console.error('Error transferring enrollment:', error);
    throw error;
  }
}

// Get classes available for transfer
export async function getAvailableClassesForTransfer(
  studentId: string,
  currentClassId: string,
  studentAge: number
): Promise<{
  eligibleClasses: Class[];
  allClasses: Class[];
}> {
  try {
    // Import required functions
    const { getClasses } = await import('./classes');
    const { getSubjects } = await import('./subjects');
    
    // Get all classes and subjects
    const [allClasses, subjects] = await Promise.all([
      getClasses(),
      getSubjects()
    ]);
    
    // Create subject map for quick lookup
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    
    // Filter classes
    const availableClasses = allClasses.filter(cls => {
      // Exclude current class
      if (cls.id === currentClassId) return false;
      
      // Include all statuses: draft, published, started, completed
      // Admin can transfer to any class
      return true;
    });
    
    // Separate into eligible (by age) and all classes
    const eligibleClasses = availableClasses.filter(cls => {
      const subject = subjectMap.get(cls.subjectId);
      if (!subject) return false;
      
      // Check if student age is within subject age range
      return studentAge >= subject.ageRange.min && 
             studentAge <= subject.ageRange.max;
    });
    
    // Add subject info to classes for display
    const enrichClasses = (classes: Class[]) => 
      classes.map(cls => ({
        ...cls,
        subject: subjectMap.get(cls.subjectId)
      }));
    
    return {
      eligibleClasses: enrichClasses(eligibleClasses),
      allClasses: enrichClasses(availableClasses)
    };
  } catch (error) {
    console.error('Error getting available classes:', error);
    return {
      eligibleClasses: [],
      allClasses: []
    };
  }
}

// Get transfer history for enrollment
export async function getEnrollmentTransferHistory(
  enrollmentId: string
): Promise<Array<{
  fromClassId: string;
  toClassId: string;
  transferredAt: Date;
  reason: string;
}>> {
  try {
    const enrollment = await getEnrollment(enrollmentId);
    if (!enrollment || !enrollment.transferHistory) return [];
    
    // Return transfer history with proper date conversion
    return enrollment.transferHistory.map(transfer => ({
      ...transfer,
      transferredAt: transfer.transferredAt instanceof Date 
        ? transfer.transferredAt 
        : new Date(transfer.transferredAt)
    }));
  } catch (error) {
    console.error('Error getting transfer history:', error);
    return [];
  }
}

// Delete enrollment completely (hard delete)
export async function deleteEnrollment(
  enrollmentId: string
): Promise<void> {
  try {
    // Get enrollment data first
    const enrollment = await getEnrollment(enrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');
    
    // Use batch write for atomic operation
    const batch = writeBatch(db);
    
    // 1. Delete enrollment document
    const enrollmentRef = doc(db, COLLECTION_NAME, enrollmentId);
    batch.delete(enrollmentRef);
    
    // 2. Decrease class enrolled count
    const classRef = doc(db, 'classes', enrollment.classId);
    batch.update(classRef, {
      enrolledCount: increment(-1)
    });
    
    // 3. Commit the batch
    await batch.commit();
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    throw error;
  }
}

