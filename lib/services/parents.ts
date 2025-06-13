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
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Parent, Student } from '@/types/models';

const COLLECTION_NAME = 'parents';

// Get all parents
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
    // Prepare data for Firestore
    const dataToSave = {
      displayName: parentData.displayName,
      phone: parentData.phone,
      createdAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
      ...(parentData.emergencyPhone && { emergencyPhone: parentData.emergencyPhone }),
      ...(parentData.email && { email: parentData.email }),
      ...(parentData.lineUserId && { lineUserId: parentData.lineUserId }),
      ...(parentData.pictureUrl && { pictureUrl: parentData.pictureUrl }),
      ...(parentData.preferredBranchId && { preferredBranchId: parentData.preferredBranchId }),
    };

    // Add address if provided
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
    const updateData: any = { ...parentData };
    
    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.lastLoginAt;
    
    // Handle address update
    if (updateData.address) {
      // Ensure all required address fields are present
      updateData.address = {
        houseNumber: updateData.address.houseNumber,
        ...(updateData.address.street && { street: updateData.address.street }),
        subDistrict: updateData.address.subDistrict,
        district: updateData.address.district,
        province: updateData.address.province,
        postalCode: updateData.address.postalCode,
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
    const docRef = await addDoc(studentsRef, {
      ...studentData,
      birthdate: Timestamp.fromDate(studentData.birthdate),
    });
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
  studentData: Partial<Student>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, parentId, 'students', studentId);
    
    // Build the update data without id and parentId
    const updateData: Partial<Student> = { ...studentData };
    delete updateData.id;
    delete updateData.parentId;
    
    // Convert birthdate to Timestamp if it exists
    if (updateData.birthdate instanceof Date) {
      await updateDoc(docRef, {
        ...updateData,
        birthdate: Timestamp.fromDate(updateData.birthdate)
      });
    } else {
      await updateDoc(docRef, updateData);
    }
  } catch (error) {
    console.error('Error updating student:', error);
    throw error;
  }
}

// Check if phone exists (updated to check both phone and emergencyPhone)
export async function checkParentPhoneExists(phone: string, excludeId?: string): Promise<boolean> {
  try {
    // Check main phone
    const phoneQuery = query(
      collection(db, COLLECTION_NAME),
      where('phone', '==', phone)
    );
    const phoneSnapshot = await getDocs(phoneQuery);
    
    // Check emergency phone
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

// Search parents (updated to include address search)
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

// Get all students with parent info
export async function getAllStudentsWithParents(): Promise<(Student & { parentName: string; parentPhone: string })[]> {
  try {
    const parents = await getParents();
    const allStudents: (Student & { parentName: string; parentPhone: string })[] = [];
    
    for (const parent of parents) {
      const students = await getStudentsByParent(parent.id);
      const studentsWithParent = students.map(student => ({
        ...student,
        parentName: parent.displayName,
        parentPhone: parent.phone
      }));
      allStudents.push(...studentsWithParent);
    }
    
    // Sort by name
    return allStudents.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting all students:', error);
    throw error;
  }
}

// Update parent's last login
export async function updateLastLogin(parentId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, parentId);
    await updateDoc(docRef, {
      lastLoginAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating last login:', error);
    throw error;
  }
}