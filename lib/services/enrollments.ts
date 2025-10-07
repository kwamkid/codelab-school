import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  Timestamp,
  serverTimestamp,
  writeBatch,
  increment,
  setDoc,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Enrollment, Class } from '@/types/models';
import { getClassSchedules } from './classes';
import { createMakeupRequest } from './makeup';
import { getClass } from './classes';

const COLLECTION_NAME = 'enrollments';

// ============================================
// 🎯 NEW: Query Options Interface
// ============================================
export interface EnrollmentQueryOptions {
  branchId?: string | null;
  status?: string;
  paymentStatus?: string;
  limit?: number;
  startAfterDoc?: QueryDocumentSnapshot;
  orderByField?: 'enrolledAt' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedEnrollments {
  enrollments: Enrollment[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
  total?: number;
}

// ============================================
// 🚀 NEW: Get Enrollments with Pagination
// ============================================
export async function getEnrollmentsPaginated(
  options: EnrollmentQueryOptions = {}
): Promise<PaginatedEnrollments> {
  try {
    const {
      branchId,
      status,
      paymentStatus,
      limit: pageSize = 20,
      startAfterDoc,
      orderByField = 'enrolledAt',
      orderDirection = 'desc'
    } = options;

    // Build query constraints
    const constraints: any[] = [];
    
    // Branch filter
    if (branchId) {
      constraints.push(where('branchId', '==', branchId));
    }
    
    // Status filter
    if (status && status !== 'all') {
      constraints.push(where('status', '==', status));
    }
    
    // Payment status filter (nested field)
    if (paymentStatus && paymentStatus !== 'all') {
      constraints.push(where('payment.status', '==', paymentStatus));
    }
    
    // Order by
    constraints.push(orderBy(orderByField, orderDirection));
    
    // Pagination cursor
    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }
    
    // Limit + 1 to check if there's more
    constraints.push(limit(pageSize + 1));
    
    // Execute query
    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const querySnapshot = await getDocs(q);
    
    // Process results
    const docs = querySnapshot.docs;
    const hasMore = docs.length > pageSize;
    const enrollmentDocs = hasMore ? docs.slice(0, pageSize) : docs;
    
    const enrollments = enrollmentDocs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      enrolledAt: doc.data().enrolledAt?.toDate() || new Date(),
      payment: {
        ...doc.data().payment,
        paidDate: doc.data().payment?.paidDate?.toDate()
      }
    } as Enrollment));
    
    return {
      enrollments,
      lastDoc: hasMore ? enrollmentDocs[enrollmentDocs.length - 1] : null,
      hasMore
    };
  } catch (error) {
    console.error('Error getting enrollments paginated:', error);
    throw error;
  }
}

// ============================================
// 🎯 NEW: Get Enrollment Stats (Optimized)
// ============================================
export interface EnrollmentStats {
  total: number;
  active: number;
  completed: number;
  dropped: number;
  totalRevenue: number;
  pendingPayments: number;
  pendingCount: number;
  partialCount: number;
  paidCount: number;
}

export async function getEnrollmentStats(branchId?: string | null): Promise<EnrollmentStats> {
  try {
    const constraints: any[] = [];
    
    if (branchId) {
      constraints.push(where('branchId', '==', branchId));
    }
    
    // Get all enrollments for stats (cached by React Query)
    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const stats: EnrollmentStats = {
      total: querySnapshot.size,
      active: 0,
      completed: 0,
      dropped: 0,
      totalRevenue: 0,
      pendingPayments: 0,
      pendingCount: 0,
      partialCount: 0,
      paidCount: 0
    };
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      
      // Count by status
      if (data.status === 'active') stats.active++;
      else if (data.status === 'completed') stats.completed++;
      else if (data.status === 'dropped') stats.dropped++;
      
      // Count by payment status
      if (data.payment?.status === 'pending') {
        stats.pendingCount++;
        stats.pendingPayments += data.pricing?.finalPrice || 0;
      } else if (data.payment?.status === 'partial') {
        stats.partialCount++;
        stats.pendingPayments += (data.pricing?.finalPrice || 0) - (data.payment?.paidAmount || 0);
      } else if (data.payment?.status === 'paid') {
        stats.paidCount++;
        stats.totalRevenue += data.payment?.paidAmount || 0;
      }
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
      pendingPayments: 0,
      pendingCount: 0,
      partialCount: 0,
      paidCount: 0
    };
  }
}

// ============================================
// 🔄 UPDATED: Get all enrollments (Legacy - for search fallback)
// ============================================
export async function getEnrollments(branchId?: string | null): Promise<Enrollment[]> {
  try {
    let constraints: any[] = [orderBy('enrolledAt', 'desc')];
    
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

// ============================================
// Existing functions (unchanged)
// ============================================

// Get enrollments by class
export async function getEnrollmentsByClass(classId: string): Promise<Enrollment[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('classId', '==', classId)
    );
    const querySnapshot = await getDocs(q);
    
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
    const batch = writeBatch(db);
    
    const enrollmentRef = doc(collection(db, COLLECTION_NAME));
    
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
    
    if (!dataToSave.pricing.promotionCode) {
      const { promotionCode: _promotionCode, ...pricingWithoutPromo } = dataToSave.pricing;
      dataToSave.pricing = pricingWithoutPromo;
    }
    
    batch.set(enrollmentRef, dataToSave);
    
    const classRef = doc(db, 'classes', enrollmentData.classId);
    batch.update(classRef, {
      enrolledCount: increment(1)
    });
    
    await batch.commit();
    
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

async function createMakeupForMissedSessions(
  enrollmentId: string,
  classId: string,
  studentId: string,
  parentId: string
): Promise<void> {
  try {
    const classData = await getClass(classId);
    if (!classData) return;
    
    const schedules = await getClassSchedules(classId);
    
    const now = new Date();
    const missedSchedules = schedules.filter(schedule => {
      const sessionDate = new Date(schedule.sessionDate);
      const [hours, minutes] = classData.endTime.split(':').map(Number);
      sessionDate.setHours(hours, minutes, 0, 0);
      
      return sessionDate < now && 
             schedule.status !== 'cancelled' &&
             schedule.status !== 'rescheduled';
    });
    
    for (const schedule of missedSchedules) {
      try {
        await createMakeupRequest({
          type: 'ad-hoc',
          originalClassId: classId,
          originalScheduleId: schedule.id,
          studentId: studentId,
          parentId: parentId,
          requestDate: new Date(),
          requestedBy: 'system',
          reason: 'สมัครเรียนหลังจากคลาสเริ่มแล้ว (Auto-generated)',
          status: 'pending',
          originalSessionNumber: schedule.sessionNumber,
          originalSessionDate: schedule.sessionDate
        });
        
        console.log(`Created makeup request for session ${schedule.sessionNumber}`);
      } catch (error) {
        console.error(`Error creating makeup for session ${schedule.sessionNumber}:`, error);
      }
    }
    
    if (missedSchedules.length > 0) {
      console.log(`Created ${missedSchedules.length} makeup requests for enrollment ${enrollmentId}`);
      
      const { getStudent } = await import('./parents');
      const studentInfo = await getStudent(parentId, studentId);
      
      if (studentInfo && classData) {
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
  }
}

// Update enrollment
export async function updateEnrollment(
  id: string,
  enrollmentData: Partial<Enrollment>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    const { id: _id, enrolledAt: _enrolledAt, ...dataToUpdate } = enrollmentData;
    
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

// Cancel enrollment
export async function cancelEnrollment(
  id: string,
  reason: string
): Promise<void> {
  try {
    const enrollment = await getEnrollment(id);
    if (!enrollment) throw new Error('Enrollment not found');
    
    const batch = writeBatch(db);
    
    const enrollmentRef = doc(db, COLLECTION_NAME, id);
    batch.update(enrollmentRef, {
      status: 'dropped',
      droppedReason: reason
    });
    
    const classRef = doc(db, 'classes', enrollment.classId);
    batch.update(classRef, {
      enrolledCount: increment(-1)
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error canceling enrollment:', error);
    throw error;
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

// Transfer enrollment to another class
export async function transferEnrollment(
  enrollmentId: string,
  newClassId: string,
  reason?: string
): Promise<void> {
  try {
    const enrollment = await getEnrollment(enrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');
    
    const batch = writeBatch(db);
    
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
    
    const oldClassRef = doc(db, 'classes', enrollment.classId);
    batch.update(oldClassRef, {
      enrolledCount: increment(-1)
    });
    
    const newClassRef = doc(db, 'classes', newClassId);
    batch.update(newClassRef, {
      enrolledCount: increment(1)
    });
    
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
    const { getClasses } = await import('./classes');
    const { getSubjects } = await import('./subjects');
    
    const [allClasses, subjects] = await Promise.all([
      getClasses(),
      getSubjects()
    ]);
    
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    
    const availableClasses = allClasses.filter(cls => {
      if (cls.id === currentClassId) return false;
      return true;
    });
    
    const eligibleClasses = availableClasses.filter(cls => {
      const subject = subjectMap.get(cls.subjectId);
      if (!subject) return false;
      
      return studentAge >= subject.ageRange.min && 
             studentAge <= subject.ageRange.max;
    });
    
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

// Delete enrollment completely
export async function deleteEnrollment(
  enrollmentId: string
): Promise<void> {
  try {
    const enrollment = await getEnrollment(enrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');
    
    const batch = writeBatch(db);
    
    const enrollmentRef = doc(db, COLLECTION_NAME, enrollmentId);
    batch.delete(enrollmentRef);
    
    const classRef = doc(db, 'classes', enrollment.classId);
    batch.update(classRef, {
      enrolledCount: increment(-1)
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    throw error;
  }
}