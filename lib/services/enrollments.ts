import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Enrollment } from '@/types/models';

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
    console.error('Error getting enrollments by class:', error);
    throw error;
  }
}

// Get enrollments by student
export async function getEnrollmentsByStudent(parentId: string, studentId: string): Promise<Enrollment[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('parentId', '==', parentId),
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
export async function checkStudentEnrolled(
  classId: string, 
  studentId: string
): Promise<boolean> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('classId', '==', classId),
      where('studentId', '==', studentId),
      where('status', 'in', ['active', 'completed'])
    );
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking student enrollment:', error);
    throw error;
  }
}

// Create new enrollment (with transaction to update class enrolledCount)
export async function createEnrollment(
  enrollmentData: Omit<Enrollment, 'id' | 'enrolledAt'>
): Promise<string> {
  try {
    return await runTransaction(db, async (transaction) => {
      // Check if class is full
      const classRef = doc(db, 'classes', enrollmentData.classId);
      const classDoc = await transaction.get(classRef);
      
      if (!classDoc.exists()) {
        throw new Error('Class not found');
      }
      
      const classData = classDoc.data();
      if (classData.enrolledCount >= classData.maxStudents) {
        throw new Error('Class is full');
      }
      
      // Create enrollment
      const enrollmentRef = doc(collection(db, COLLECTION_NAME));
      const enrollmentToSave = {
        ...enrollmentData,
        enrolledAt: Timestamp.now(),
        payment: {
          ...enrollmentData.payment,
          paidDate: enrollmentData.payment.paidDate ? 
            Timestamp.fromDate(new Date()) : undefined
        }
      };
      
      transaction.set(enrollmentRef, enrollmentToSave);
      
      // Update class enrolled count
      transaction.update(classRef, {
        enrolledCount: increment(1)
      });
      
      return enrollmentRef.id;
    });
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
    
    // Build update data with proper typing
    const { id: _, enrolledAt, ...dataToUpdate } = enrollmentData;
    
    // Handle payment date
    if (dataToUpdate.payment?.paidDate) {
      dataToUpdate.payment = {
        ...dataToUpdate.payment,
        paidDate: Timestamp.fromDate(dataToUpdate.payment.paidDate)
      };
    }
    
    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    console.error('Error updating enrollment:', error);
    throw error;
  }
}

// Update payment status
export async function updatePaymentStatus(
  enrollmentId: string,
  paymentData: Enrollment['payment']
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, enrollmentId);
    
    const updateData = {
      payment: {
        ...paymentData,
        paidDate: paymentData.paidDate ? 
          Timestamp.fromDate(paymentData.paidDate) : undefined
      }
    };
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
}

// Drop student from class (with transaction to update class enrolledCount)
export async function dropStudent(
  enrollmentId: string,
  reason: string
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      // Get enrollment
      const enrollmentRef = doc(db, COLLECTION_NAME, enrollmentId);
      const enrollmentDoc = await transaction.get(enrollmentRef);
      
      if (!enrollmentDoc.exists()) {
        throw new Error('Enrollment not found');
      }
      
      const enrollmentData = enrollmentDoc.data();
      
      // Update enrollment status
      transaction.update(enrollmentRef, {
        status: 'dropped',
        droppedReason: reason
      });
      
      // Update class enrolled count
      const classRef = doc(db, 'classes', enrollmentData.classId);
      transaction.update(classRef, {
        enrolledCount: increment(-1)
      });
    });
  } catch (error) {
    console.error('Error dropping student:', error);
    throw error;
  }
}

// Transfer student to another class
export async function transferStudent(
  enrollmentId: string,
  newClassId: string,
  newBranchId: string
): Promise<string> {
  try {
    return await runTransaction(db, async (transaction) => {
      // Get current enrollment
      const enrollmentRef = doc(db, COLLECTION_NAME, enrollmentId);
      const enrollmentDoc = await transaction.get(enrollmentRef);
      
      if (!enrollmentDoc.exists()) {
        throw new Error('Enrollment not found');
      }
      
      const currentEnrollment = enrollmentDoc.data();
      
      // Check if new class has space
      const newClassRef = doc(db, 'classes', newClassId);
      const newClassDoc = await transaction.get(newClassRef);
      
      if (!newClassDoc.exists()) {
        throw new Error('New class not found');
      }
      
      const newClassData = newClassDoc.data();
      if (newClassData.enrolledCount >= newClassData.maxStudents) {
        throw new Error('New class is full');
      }
      
      // Update old enrollment
      transaction.update(enrollmentRef, {
        status: 'transferred'
      });
      
      // Create new enrollment
      const newEnrollmentRef = doc(collection(db, COLLECTION_NAME));
      const newEnrollmentData = {
        studentId: currentEnrollment.studentId,
        classId: newClassId,
        parentId: currentEnrollment.parentId,
        branchId: newBranchId,
        status: 'active' as const,
        pricing: currentEnrollment.pricing,
        payment: currentEnrollment.payment,
        transferredFrom: enrollmentId,
        enrolledAt: Timestamp.now()
      };
      
      transaction.set(newEnrollmentRef, newEnrollmentData);
      
      // Update class enrolled counts
      const oldClassRef = doc(db, 'classes', currentEnrollment.classId);
      transaction.update(oldClassRef, {
        enrolledCount: increment(-1)
      });
      
      transaction.update(newClassRef, {
        enrolledCount: increment(1)
      });
      
      return newEnrollmentRef.id;
    });
  } catch (error) {
    console.error('Error transferring student:', error);
    throw error;
  }
}

// Get enrollment statistics
export async function getEnrollmentStats(
  branchId?: string
): Promise<{
  total: number;
  active: number;
  completed: number;
  dropped: number;
  pendingPayment: number;
  totalRevenue: number;
}> {
  try {
    let q = query(collection(db, COLLECTION_NAME));
    
    if (branchId) {
      q = query(
        collection(db, COLLECTION_NAME),
        where('branchId', '==', branchId)
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    const stats = {
      total: 0,
      active: 0,
      completed: 0,
      dropped: 0,
      pendingPayment: 0,
      totalRevenue: 0
    };
    
    querySnapshot.forEach(doc => {
      const enrollment = doc.data() as Enrollment;
      stats.total++;
      
      switch (enrollment.status) {
        case 'active':
          stats.active++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'dropped':
          stats.dropped++;
          break;
      }
      
      if (enrollment.payment.status === 'pending') {
        stats.pendingPayment++;
      }
      
      if (enrollment.payment.status === 'paid') {
        stats.totalRevenue += enrollment.payment.paidAmount;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting enrollment stats:', error);
    throw error;
  }
}