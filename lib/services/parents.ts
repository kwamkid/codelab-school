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
  deleteField,
  limit,
  serverTimestamp
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
    // Create a properly typed data object for Firestore
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

    // Add optional fields if they exist
    if (parentData.emergencyPhone) dataToSave.emergencyPhone = parentData.emergencyPhone;
    if (parentData.email) dataToSave.email = parentData.email;
    if (parentData.lineUserId) dataToSave.lineUserId = parentData.lineUserId;
    if (parentData.pictureUrl) dataToSave.pictureUrl = parentData.pictureUrl;
    if (parentData.preferredBranchId) dataToSave.preferredBranchId = parentData.preferredBranchId;

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
    
    // Create a properly typed update object
    const updateData: any = {};
    
    // Copy only the fields that should be updated
    if (parentData.displayName !== undefined) updateData.displayName = parentData.displayName;
    if (parentData.phone !== undefined) updateData.phone = parentData.phone;
    if (parentData.emergencyPhone !== undefined) updateData.emergencyPhone = parentData.emergencyPhone;
    if (parentData.email !== undefined) updateData.email = parentData.email;
    
    // Handle LINE fields - use deleteField() for null values
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
    
    // Handle address update
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
    
    // Prepare data without undefined values
    const dataToSave: any = {
      name: studentData.name,
      nickname: studentData.nickname,
      birthdate: Timestamp.fromDate(studentData.birthdate),
      gender: studentData.gender,
      isActive: studentData.isActive ?? true,
    };
    
    // Add optional fields only if they have values
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
    
    // Prepare update data
    const updateData: any = {};
    
    // Add fields to update, excluding id and parentId
    Object.keys(data).forEach(key => {
      if (key !== 'id' && key !== 'parentId' && data[key as keyof Student] !== undefined) {
        if (key === 'birthdate' && data.birthdate) {
          updateData[key] = Timestamp.fromDate(data.birthdate);
        } else {
          updateData[key] = data[key as keyof Student];
        }
      }
    });
    
    // Add updatedAt timestamp
    updateData.updatedAt = serverTimestamp();
    
    await updateDoc(studentRef, updateData);
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

// Get all students with parent info (including LINE display name)
export async function getAllStudentsWithParents(): Promise<(Student & { 
  parentName: string; 
  parentPhone: string;
  lineDisplayName?: string;
})[]> {
  try {
    const parentsSnapshot = await getDocs(collection(db, 'parents'));
    const allStudents: (Student & { 
      parentName: string; 
      parentPhone: string;
      lineDisplayName?: string;
    })[] = [];
    
    for (const parentDoc of parentsSnapshot.docs) {
      const parentData = {
        id: parentDoc.id,
        ...parentDoc.data()
      } as Parent;
      
      const studentsSnapshot = await getDocs(
        collection(db, 'parents', parentDoc.id, 'students')
      );
      
      const students = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        parentId: parentDoc.id,
        ...doc.data(),
        birthdate: doc.data().birthdate?.toDate() || new Date(),
        parentName: parentData.displayName,
        parentPhone: parentData.phone,
        lineDisplayName: parentData.displayName // LINE display name
      } as Student & { 
        parentName: string; 
        parentPhone: string;
        lineDisplayName?: string;
      }));
      
      allStudents.push(...students);
    }
    
    return allStudents;
  } catch (error) {
    console.error('Error getting all students with parents:', error);
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
    // First, find which parent has this student
    const parentsSnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    for (const parentDoc of parentsSnapshot.docs) {
      const studentDoc = await getDoc(
        doc(db, COLLECTION_NAME, parentDoc.id, 'students', studentId)
      );
      
      if (studentDoc.exists()) {
        const parentData = parentDoc.data() as Parent;
        const studentData = studentDoc.data() as Student;
        
        return {
          id: studentDoc.id,
          ...studentData,
          parentId: parentDoc.id,
          parentName: parentData.displayName,
          parentPhone: parentData.phone,
          lineDisplayName: parentData.displayName,
          birthdate: studentData.birthdate?.toDate() || new Date(),
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
    // Don't check if lineUserId is empty
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