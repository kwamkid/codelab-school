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
  Timestamp,
  deleteField,
  limit,
  serverTimestamp,
  collectionGroup,
  documentId
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Parent, Student } from '@/types/models';

const COLLECTION_NAME = 'parents';

// ============================================
// 🚀 BEST: Fast Student Loading with collectionGroup (Requires Firestore Rules)
// ============================================
export async function getAllStudentsWithParentsFast(): Promise<(Student & { 
  parentName: string; 
  parentPhone: string;
  lineDisplayName?: string;
})[]> {
  try {
    console.time('getAllStudentsWithParentsFast');
    
    // Step 1: Query ALL students at once using collectionGroup (1 query!)
    console.time('Step 1: Query all students');
    const studentsQuery = query(
      collectionGroup(db, 'students'),
      orderBy('birthdate', 'asc')
    );
    const studentsSnapshot = await getDocs(studentsQuery);
    console.timeEnd('Step 1: Query all students');
    console.log(`Found ${studentsSnapshot.size} students`);
    
    // Step 2: Extract unique parent IDs
    const parentIds = new Set<string>();
    studentsSnapshot.docs.forEach(doc => {
      const parentId = doc.ref.parent.parent?.id;
      if (parentId) parentIds.add(parentId);
    });
    console.log(`Found ${parentIds.size} unique parents`);
    
    // Step 3: Batch query parents efficiently
    console.time('Step 3: Query parents in batches');
    const parentMap = new Map<string, { displayName: string; phone: string }>();
    const parentIdsArray = Array.from(parentIds);
    
    // Firestore 'in' query limit = 30
    const batchSize = 30;
    const batches: Promise<void>[] = [];
    
    for (let i = 0; i < parentIdsArray.length; i += batchSize) {
      const batch = parentIdsArray.slice(i, i + batchSize);
      
      const batchPromise = (async () => {
        const parentsQuery = query(
          collection(db, 'parents'),
          where(documentId(), 'in', batch)
        );
        const parentsSnapshot = await getDocs(parentsQuery);
        
        parentsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          parentMap.set(doc.id, {
            displayName: data.displayName || 'Unknown',
            phone: data.phone || ''
          });
        });
      })();
      
      batches.push(batchPromise);
    }
    
    // Run all parent queries in parallel!
    await Promise.all(batches);
    console.timeEnd('Step 3: Query parents in batches');
    
    // Step 4: Combine data (fast - in memory)
    console.time('Step 4: Combine data');
    const result = studentsSnapshot.docs.map(doc => {
      const data = doc.data();
      const parentId = doc.ref.parent.parent?.id || '';
      const parent = parentMap.get(parentId);
      
      return {
        id: doc.id,
        parentId,
        name: data.name || '',
        nickname: data.nickname || '',
        birthdate: data.birthdate?.toDate ? data.birthdate.toDate() : new Date(data.birthdate),
        gender: data.gender || 'M',
        schoolName: data.schoolName,
        gradeLevel: data.gradeLevel,
        profileImage: data.profileImage,
        allergies: data.allergies,
        specialNeeds: data.specialNeeds,
        emergencyContact: data.emergencyContact,
        emergencyPhone: data.emergencyPhone,
        isActive: data.isActive ?? true,
        parentName: parent?.displayName || 'Unknown',
        parentPhone: parent?.phone || '',
        lineDisplayName: parent?.displayName
      } as Student & { 
        parentName: string; 
        parentPhone: string;
        lineDisplayName?: string;
      };
    });
    console.timeEnd('Step 4: Combine data');
    
    console.timeEnd('getAllStudentsWithParentsFast');
    console.log(`Total students with parent info: ${result.length}`);
    
    return result;
  } catch (error) {
    console.error('Error getting students fast (collectionGroup):', error);
    console.log('Falling back to optimized batch method...');
    // Fallback to batch method if collectionGroup fails
    return getAllStudentsWithParentsBatch();
  }
}

// ============================================
// 🔄 FALLBACK: Optimized Batch Loading (No collectionGroup required)
// ============================================
export async function getAllStudentsWithParentsBatch(): Promise<(Student & { 
  parentName: string; 
  parentPhone: string;
  lineDisplayName?: string;
})[]> {
  try {
    console.time('getAllStudentsWithParentsBatch');
    
    // Step 1: Get all parents first (1 query)
    console.time('Step 1: Query all parents');
    const parentsSnapshot = await getDocs(
      query(collection(db, 'parents'), orderBy('createdAt', 'desc'))
    );
    console.timeEnd('Step 1: Query all parents');
    console.log(`Found ${parentsSnapshot.size} parents`);
    
    // Step 2: Create parent map
    const parentMap = new Map<string, { displayName: string; phone: string }>();
    parentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      parentMap.set(doc.id, {
        displayName: data.displayName || 'Unknown',
        phone: data.phone || ''
      });
    });
    
    // Step 3: Query students in parallel batches (NOT one-by-one!)
    console.time('Step 3: Query students in parallel');
    const batchSize = 10; // Query 10 parents' students at once
    const allStudents: (Student & { 
      parentName: string; 
      parentPhone: string;
      lineDisplayName?: string;
    })[] = [];
    
    const parentIds = Array.from(parentMap.keys());
    const batches: Promise<void>[] = [];
    
    for (let i = 0; i < parentIds.length; i += batchSize) {
      const batchParentIds = parentIds.slice(i, i + batchSize);
      
      const batchPromise = (async () => {
        // Query students for this batch of parents in parallel
        const studentPromises = batchParentIds.map(async (parentId) => {
          try {
            const studentsQuery = query(
              collection(db, 'parents', parentId, 'students'),
              orderBy('birthdate', 'asc')
            );
            const studentsSnapshot = await getDocs(studentsQuery);
            const parent = parentMap.get(parentId);
            
            return studentsSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                parentId,
                name: data.name || '',
                nickname: data.nickname || '',
                birthdate: data.birthdate?.toDate ? data.birthdate.toDate() : new Date(data.birthdate),
                gender: data.gender || 'M',
                schoolName: data.schoolName,
                gradeLevel: data.gradeLevel,
                profileImage: data.profileImage,
                allergies: data.allergies,
                specialNeeds: data.specialNeeds,
                emergencyContact: data.emergencyContact,
                emergencyPhone: data.emergencyPhone,
                isActive: data.isActive ?? true,
                parentName: parent?.displayName || 'Unknown',
                parentPhone: parent?.phone || '',
                lineDisplayName: parent?.displayName
              } as Student & { 
                parentName: string; 
                parentPhone: string;
                lineDisplayName?: string;
              };
            });
          } catch (error) {
            console.error(`Error fetching students for parent ${parentId}:`, error);
            return [];
          }
        });
        
        // Wait for all students in this batch
        const batchResults = await Promise.all(studentPromises);
        // Flatten and add to results
        batchResults.forEach(students => allStudents.push(...students));
      })();
      
      batches.push(batchPromise);
    }
    
    // Run all batches in parallel
    await Promise.all(batches);
    console.timeEnd('Step 3: Query students in parallel');
    
    console.timeEnd('getAllStudentsWithParentsBatch');
    console.log(`Total students: ${allStudents.length}`);
    
    return allStudents;
  } catch (error) {
    console.error('Error getting students batch:', error);
    return [];
  }
}

// ============================================
// 🎯 PUBLIC: Smart Auto-Select Method
// ============================================
export async function getAllStudentsWithParents(): Promise<(Student & { 
  parentName: string; 
  parentPhone: string;
  lineDisplayName?: string;
})[]> {
  // Try fast method first (collectionGroup), fallback to batch if fails
  return getAllStudentsWithParentsFast();
}

// ============================================
// Existing functions below (unchanged)
// ============================================

// Get all parents - ไม่ filter ตาม branch เพราะเป็นข้อมูลกลาง
export async function getParents(): Promise<Parent[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      lastLoginAt: doc.data().lastLoginAt?.toDate() || new Date(),
    } as Parent));
  } catch (error) {
    console.error('Error getting parents:', error);
    throw error;
  }
}

// Get parents with enrollment info for specific branch
export async function getParentsWithBranchInfo(branchId?: string): Promise<(Parent & {
  enrolledInBranch?: boolean;
  studentCountInBranch?: number;
})[]> {
  try {
    const parents = await getParents();
    
    if (!branchId) {
      return parents;
    }
    
    const { getEnrollmentsByBranch } = await import('./enrollments');
    const enrollments = await getEnrollmentsByBranch(branchId);
    
    const parentStudentCount = new Map<string, Set<string>>();
    enrollments.forEach(enrollment => {
      if (!parentStudentCount.has(enrollment.parentId)) {
        parentStudentCount.set(enrollment.parentId, new Set());
      }
      parentStudentCount.get(enrollment.parentId)!.add(enrollment.studentId);
    });
    
    return parents.map(parent => ({
      ...parent,
      enrolledInBranch: parentStudentCount.has(parent.id),
      studentCountInBranch: parentStudentCount.get(parent.id)?.size || 0
    }));
  } catch (error) {
    console.error('Error getting parents with branch info:', error);
    throw error;
  }
}

// Get single parent
export async function getParent(id: string): Promise<Parent | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        lastLoginAt: docSnap.data().lastLoginAt?.toDate() || new Date(),
      } as Parent;
    }
    return null;
  } catch (error) {
    console.error('Error getting parent:', error);
    throw error;
  }
}

// Get parent by LINE User ID
export async function getParentByLineId(lineUserId: string): Promise<Parent | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('lineUserId', '==', lineUserId)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastLoginAt: doc.data().lastLoginAt?.toDate() || new Date(),
      } as Parent;
    }
    return null;
  } catch (error) {
    console.error('Error getting parent by LINE ID:', error);
    throw error;
  }
}

// Create new parent
export async function createParent(parentData: Omit<Parent, 'id' | 'createdAt' | 'lastLoginAt'>): Promise<string> {
  try {
    const dataToSave: {
      displayName: string;
      phone: string;
      createdAt: Timestamp;
      lastLoginAt: Timestamp;
      emergencyPhone?: string;
      email?: string;
      lineUserId?: string;
      pictureUrl?: string;
      preferredBranchId?: string;
      address?: {
        houseNumber: string;
        street?: string;
        subDistrict: string;
        district: string;
        province: string;
        postalCode: string;
      };
    } = {
      displayName: parentData.displayName,
      phone: parentData.phone,
      createdAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
    };

    if (parentData.emergencyPhone) dataToSave.emergencyPhone = parentData.emergencyPhone;
    if (parentData.email) dataToSave.email = parentData.email;
    if (parentData.lineUserId) dataToSave.lineUserId = parentData.lineUserId;
    if (parentData.pictureUrl) dataToSave.pictureUrl = parentData.pictureUrl;
    if (parentData.preferredBranchId) dataToSave.preferredBranchId = parentData.preferredBranchId;

    if (parentData.address) {
      dataToSave.address = {
        houseNumber: parentData.address.houseNumber,
        ...(parentData.address.street && { street: parentData.address.street }),
        subDistrict: parentData.address.subDistrict,
        district: parentData.address.district,
        province: parentData.address.province,
        postalCode: parentData.address.postalCode,
      };
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), dataToSave);
    return docRef.id;
  } catch (error) {
    console.error('Error creating parent:', error);
    throw error;
  }
}

// Update parent
export async function updateParent(id: string, parentData: Partial<Parent>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    const updateData: any = {};
    
    if (parentData.displayName !== undefined) updateData.displayName = parentData.displayName;
    if (parentData.phone !== undefined) updateData.phone = parentData.phone;
    if (parentData.emergencyPhone !== undefined) updateData.emergencyPhone = parentData.emergencyPhone;
    if (parentData.email !== undefined) updateData.email = parentData.email;
    
    if (parentData.lineUserId !== undefined) {
      updateData.lineUserId = parentData.lineUserId === null || parentData.lineUserId === '' 
        ? deleteField() 
        : parentData.lineUserId;
    }
    
    if (parentData.pictureUrl !== undefined) {
      updateData.pictureUrl = parentData.pictureUrl === null || parentData.pictureUrl === '' 
        ? deleteField() 
        : parentData.pictureUrl;
    }
    
    if (parentData.preferredBranchId !== undefined) updateData.preferredBranchId = parentData.preferredBranchId;
    
    if (parentData.address !== undefined) {
      updateData.address = {
        houseNumber: parentData.address.houseNumber,
        ...(parentData.address.street && { street: parentData.address.street }),
        subDistrict: parentData.address.subDistrict,
        district: parentData.address.district,
        province: parentData.address.province,
        postalCode: parentData.address.postalCode,
      };
    }
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating parent:', error);
    throw error;
  }
}

// Get students by parent
export async function getStudentsByParent(parentId: string): Promise<Student[]> {
  try {
    const studentsRef = collection(db, COLLECTION_NAME, parentId, 'students');
    const q = query(studentsRef, orderBy('birthdate', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      parentId,
      ...doc.data(),
      birthdate: doc.data().birthdate?.toDate() || new Date(),
    } as Student));
  } catch (error) {
    console.error('Error getting students:', error);
    throw error;
  }
}

// Get single student
export async function getStudent(parentId: string, studentId: string): Promise<Student | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, parentId, 'students', studentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        parentId,
        ...docSnap.data(),
        birthdate: docSnap.data().birthdate?.toDate() || new Date(),
      } as Student;
    }
    return null;
  } catch (error) {
    console.error('Error getting student:', error);
    throw error;
  }
}

// Create new student
export async function createStudent(
  parentId: string, 
  studentData: Omit<Student, 'id' | 'parentId'>
): Promise<string> {
  try {
    const studentsRef = collection(db, COLLECTION_NAME, parentId, 'students');
    
    const dataToSave: any = {
      name: studentData.name,
      nickname: studentData.nickname,
      birthdate: Timestamp.fromDate(studentData.birthdate),
      gender: studentData.gender,
      isActive: studentData.isActive ?? true,
    };
    
    if (studentData.schoolName) dataToSave.schoolName = studentData.schoolName;
    if (studentData.gradeLevel) dataToSave.gradeLevel = studentData.gradeLevel;
    if (studentData.profileImage) dataToSave.profileImage = studentData.profileImage;
    if (studentData.allergies) dataToSave.allergies = studentData.allergies;
    if (studentData.specialNeeds) dataToSave.specialNeeds = studentData.specialNeeds;
    if (studentData.emergencyContact) dataToSave.emergencyContact = studentData.emergencyContact;
    if (studentData.emergencyPhone) dataToSave.emergencyPhone = studentData.emergencyPhone;
    
    const docRef = await addDoc(studentsRef, dataToSave);
    return docRef.id;
  } catch (error) {
    console.error('Error creating student:', error);
    throw error;
  }
}

// Update student
export async function updateStudent(
  parentId: string,
  studentId: string,
  data: Partial<Student>
): Promise<void> {
  try {
    const studentRef = doc(db, 'parents', parentId, 'students', studentId);
    
    const updateData: any = {};
    
    Object.keys(data).forEach(key => {
      if (key !== 'id' && key !== 'parentId' && data[key as keyof Student] !== undefined) {
        if (key === 'birthdate' && data.birthdate) {
          updateData[key] = Timestamp.fromDate(data.birthdate);
        } else {
          updateData[key] = data[key as keyof Student];
        }
      }
    });
    
    updateData.updatedAt = serverTimestamp();
    
    await updateDoc(studentRef, updateData);
  } catch (error) {
    console.error('Error updating student:', error);
    throw error;
  }
}

// Check if phone exists
export async function checkParentPhoneExists(phone: string, excludeId?: string): Promise<boolean> {
  try {
    const phoneQuery = query(
      collection(db, COLLECTION_NAME),
      where('phone', '==', phone)
    );
    const phoneSnapshot = await getDocs(phoneQuery);
    
    const emergencyPhoneQuery = query(
      collection(db, COLLECTION_NAME),
      where('emergencyPhone', '==', phone)
    );
    const emergencyPhoneSnapshot = await getDocs(emergencyPhoneQuery);
    
    if (excludeId) {
      const phoneExists = phoneSnapshot.docs.some(doc => doc.id !== excludeId);
      const emergencyPhoneExists = emergencyPhoneSnapshot.docs.some(doc => doc.id !== excludeId);
      return phoneExists || emergencyPhoneExists;
    }
    
    return !phoneSnapshot.empty || !emergencyPhoneSnapshot.empty;
  } catch (error) {
    console.error('Error checking phone:', error);
    throw error;
  }
}

// Search parents
export async function searchParents(searchTerm: string): Promise<Parent[]> {
  try {
    const parents = await getParents();
    const term = searchTerm.toLowerCase();
    
    return parents.filter(parent => 
      parent.displayName.toLowerCase().includes(term) ||
      parent.phone?.toLowerCase().includes(term) ||
      parent.emergencyPhone?.toLowerCase().includes(term) ||
      parent.email?.toLowerCase().includes(term) ||
      parent.address?.province?.toLowerCase().includes(term) ||
      parent.address?.district?.toLowerCase().includes(term) ||
      parent.address?.subDistrict?.toLowerCase().includes(term)
    );
  } catch (error) {
    console.error('Error searching parents:', error);
    throw error;
  }
}

// Get parent with students
export async function getParentWithStudents(
  parentId: string
): Promise<{ parent: Parent | null; students: Student[] }> {
  try {
    const [parent, students] = await Promise.all([
      getParent(parentId),
      getStudentsByParent(parentId)
    ]);
    
    return { parent, students };
  } catch (error) {
    console.error('Error getting parent with students:', error);
    throw error;
  }
}

// Get students with enrollment info for branch
export async function getAllStudentsWithBranchInfo(branchId?: string): Promise<(Student & { 
  parentName: string; 
  parentPhone: string;
  lineDisplayName?: string;
  enrolledInBranch?: boolean;
  classesInBranch?: string[];
})[]> {
  try {
    const students = await getAllStudentsWithParents();
    
    if (!branchId) {
      return students;
    }
    
    const { getEnrollmentsByBranch } = await import('./enrollments');
    const enrollments = await getEnrollmentsByBranch(branchId);
    
    const studentEnrollments = new Map<string, string[]>();
    enrollments.forEach(enrollment => {
      if (!studentEnrollments.has(enrollment.studentId)) {
        studentEnrollments.set(enrollment.studentId, []);
      }
      studentEnrollments.get(enrollment.studentId)!.push(enrollment.classId);
    });
    
    return students.map(student => ({
      ...student,
      enrolledInBranch: studentEnrollments.has(student.id),
      classesInBranch: studentEnrollments.get(student.id) || []
    }));
  } catch (error) {
    console.error('Error getting students with branch info:', error);
    return [];
  }
}

// Get single student with parent info
export async function getStudentWithParent(studentId: string): Promise<(Student & { 
  parentName: string; 
  parentPhone: string;
  lineDisplayName?: string;
}) | null> {
  try {
    const parentsSnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    for (const parentDoc of parentsSnapshot.docs) {
      const studentDoc = await getDoc(
        doc(db, COLLECTION_NAME, parentDoc.id, 'students', studentId)
      );
      
      if (studentDoc.exists()) {
        const parentData = parentDoc.data() as Parent;
        const studentData = studentDoc.data();
        
        return {
          id: studentDoc.id,
          ...studentData,
          parentId: parentDoc.id,
          parentName: parentData.displayName,
          parentPhone: parentData.phone,
          lineDisplayName: parentData.displayName,
          birthdate: studentData.birthdate?.toDate ? studentData.birthdate.toDate() : 
                     studentData.birthdate instanceof Date ? studentData.birthdate :
                     new Date(studentData.birthdate),
        } as Student & { 
          parentName: string; 
          parentPhone: string;
          lineDisplayName?: string;
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting student with parent:', error);
    return null;
  }
}

// Check if LINE User ID already exists
export async function checkLineUserIdExists(lineUserId: string): Promise<{ exists: boolean; parentId?: string }> {
  try {
    if (!lineUserId || lineUserId.trim() === '') {
      return { exists: false };
    }
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('lineUserId', '==', lineUserId)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return { 
        exists: true, 
        parentId: querySnapshot.docs[0].id 
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Error checking LINE User ID:', error);
    throw error;
  }
}

// Get parent by phone number
export async function getParentByPhone(phone: string): Promise<Parent | null> {
  try {
    const cleanPhone = phone.replace(/[-\s]/g, '');
    const q = query(
      collection(db, COLLECTION_NAME),
      where('phone', '==', cleanPhone),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      lastLoginAt: doc.data().lastLoginAt?.toDate() || new Date(),
    } as Parent;
  } catch (error) {
    console.error('Error getting parent by phone:', error);
    return null;
  }
}

// Delete student
export async function deleteStudent(
  parentId: string, 
  studentId: string
): Promise<void> {
  try {
    const { getEnrollmentsByStudent } = await import('./enrollments');
    const enrollments = await getEnrollmentsByStudent(studentId);
    
    if (enrollments.length > 0) {
      throw new Error('ไม่สามารถลบนักเรียนที่มีประวัติการลงทะเบียนเรียนได้');
    }
    
    const studentRef = doc(db, COLLECTION_NAME, parentId, 'students', studentId);
    await deleteDoc(studentRef);
    
    console.log('Student deleted successfully:', studentId);
  } catch (error) {
    console.error('Error deleting student:', error);
    throw error;
  }
}

// Delete parent
export async function deleteParent(parentId: string): Promise<void> {
  try {
    const students = await getStudentsByParent(parentId);
    
    if (students.length > 0) {
      throw new Error('ไม่สามารถลบผู้ปกครองที่ยังมีข้อมูลนักเรียนได้ กรุณาลบข้อมูลนักเรียนทั้งหมดก่อน');
    }
    
    const parentRef = doc(db, COLLECTION_NAME, parentId);
    await deleteDoc(parentRef);
    
    console.log('Parent deleted successfully:', parentId);
  } catch (error) {
    console.error('Error deleting parent:', error);
    throw error;
  }
}

// Check if student can be deleted
export async function canDeleteStudent(studentId: string): Promise<{
  canDelete: boolean;
  reason?: string;
  enrollmentCount?: number;
}> {
  try {
    const { getEnrollmentsByStudent } = await import('./enrollments');
    const enrollments = await getEnrollmentsByStudent(studentId);
    
    if (enrollments.length > 0) {
      return {
        canDelete: false,
        reason: `นักเรียนมีประวัติการลงทะเบียน ${enrollments.length} คลาส`,
        enrollmentCount: enrollments.length
      };
    }
    
    return { canDelete: true };
  } catch (error) {
    console.error('Error checking if student can be deleted:', error);
    return {
      canDelete: false,
      reason: 'เกิดข้อผิดพลาดในการตรวจสอบ'
    };
  }
}

// Check if parent can be deleted
export async function canDeleteParent(parentId: string): Promise<{
  canDelete: boolean;
  reason?: string;
  studentCount?: number;
}> {
  try {
    const students = await getStudentsByParent(parentId);
    
    if (students.length > 0) {
      return {
        canDelete: false,
        reason: `ผู้ปกครองยังมีข้อมูลนักเรียน ${students.length} คน`,
        studentCount: students.length
      };
    }
    
    return { canDelete: true };
  } catch (error) {
    console.error('Error checking if parent can be deleted:', error);
    return {
      canDelete: false,
      reason: 'เกิดข้อผิดพลาดในการตรวจสอบ'
    };
  }
}