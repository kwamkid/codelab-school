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
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Enrollment } from '@/types/models';
import { getClass, updateClass } from './classes';

const COLLECTION_NAME = 'enrollments';

// Get all enrollments
export async function getEnrollments(): Promise<Enrollment[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
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
    console.error('Error getting enrollments:', error);
    throw error;
  }
}

// Get enrollments by class
export async function getEnrollmentsByClass(classId: string): Promise<Enrollment[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('classId', '==', classId),
      where('status', 'in', ['active', 'completed']),
      orderBy('enrolledAt', 'asc')
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
    console.error('Error getting enrollments by class:', error);
    throw error;
  }
}

// Get enrollments by student
export async function getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentId),
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
    console.error('Error getting enrollments by student:', error);
    throw error;
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
      where('classId', '==', classId),
      where('status', 'in', ['active', 'completed'])
    );
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
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
    
    // Clean up the data to remove undefined values
    const cleanedData = {
      ...enrollmentData,
      enrolledAt: serverTimestamp(),
    };
    
    // Remove undefined values from pricing
    if (cleanedData.pricing.promotionCode === undefined) {
      delete cleanedData.pricing.promotionCode;
    }
    
    // If payment date exists, convert to Timestamp
    if (enrollmentData.payment.paidDate) {
      cleanedData.payment = {
        ...enrollmentData.payment,
        paidDate: Timestamp.fromDate(enrollmentData.payment.paidDate)
      };
    }
    
    batch.set(enrollmentRef, cleanedData);
    
    // 2. Update class enrolled count
    const classRef = doc(db, 'classes', enrollmentData.classId);
    batch.update(classRef, {
      enrolledCount: increment(1)
    });
    
    // 3. Commit the batch
    await batch.commit();
    
    return enrollmentRef.id;
  } catch (error) {
    console.error('Error creating enrollment:', error);
    throw error;
  }
}

// Update enrollment
export async function updateEnrollment(
  id: string,
  enrollmentData: Partial<Enrollment>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // Build update data
    const updateData = { ...enrollmentData };
    delete updateData.id;
    delete updateData.enrolledAt;
    
    // Convert payment date if exists
    if (updateData.payment?.paidDate instanceof Date) {
      updateData.payment = {
        ...updateData.payment,
        paidDate: Timestamp.fromDate(updateData.payment.paidDate)
      };
    }
    
    await updateDoc(docRef, updateData);
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
export async function getEnrollmentStats(): Promise<{
  total: number;
  active: number;
  completed: number;
  dropped: number;
  totalRevenue: number;
  pendingPayments: number;
}> {
  try {
    const enrollments = await getEnrollments();
    
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

// Transfer enrollment to another class
export async function transferEnrollment(
  enrollmentId: string,
  newClassId: string,
  reason?: string
): Promise<void> {
  try {
    const enrollment = await getEnrollment(enrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');
    
    // Check available seats in new class
    const availability = await checkAvailableSeats(newClassId);
    if (!availability.available) {
      throw new Error('No available seats in the target class');
    }
    
    // Use batch write for atomic operation
    const batch = writeBatch(db);
    
    // 1. Update enrollment
    const enrollmentRef = doc(db, COLLECTION_NAME, enrollmentId);
    batch.update(enrollmentRef, {
      classId: newClassId,
      transferredFrom: enrollment.classId,
      status: 'transferred'
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