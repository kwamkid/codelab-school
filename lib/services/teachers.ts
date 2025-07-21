import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Teacher } from '@/types/models';

const COLLECTION_NAME = 'teachers';

// Get all teachers
export async function getTeachers(branchId?: string): Promise<Teacher[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    let teachers = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Teacher));
    
    // Filter by branch if specified
    if (branchId) {
      teachers = teachers.filter(teacher => 
        teacher.availableBranches.includes(branchId)
      );
    }
    
    return teachers;
  } catch (error) {
    console.error('Error getting teachers:', error);
    throw error;
  }
}

// Get active teachers only
export async function getActiveTeachers(branchId?: string): Promise<Teacher[]> {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    let teachers = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Teacher));
    
    // Filter by branch if specified
    if (branchId) {
      teachers = teachers.filter(teacher => 
        teacher.availableBranches.includes(branchId)
      );
    }
    
    // Filter active teachers in memory
    return teachers
      .filter(teacher => teacher.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting active teachers:', error);
    throw error;
  }
}

// Get teachers by branch
export async function getTeachersByBranch(branchId: string): Promise<Teacher[]> {
  try {
    const allTeachers = await getActiveTeachers();
    return allTeachers.filter(teacher => 
      teacher.availableBranches.includes(branchId)
    );
  } catch (error) {
    console.error('Error getting teachers by branch:', error);
    throw error;
  }
}

// Get teachers by specialty
export async function getTeachersBySpecialty(subjectId: string): Promise<Teacher[]> {
  try {
    const allTeachers = await getActiveTeachers();
    return allTeachers.filter(teacher => 
      teacher.specialties.includes(subjectId)
    );
  } catch (error) {
    console.error('Error getting teachers by specialty:', error);
    throw error;
  }
}

// Get single teacher
export async function getTeacher(id: string): Promise<Teacher | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Teacher;
    }
    return null;
  } catch (error) {
    console.error('Error getting teacher:', error);
    throw error;
  }
}

// Create new teacher
export async function createTeacher(teacherData: Omit<Teacher, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), teacherData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating teacher:', error);
    throw error;
  }
}

// Update teacher
export async function updateTeacher(id: string, teacherData: Partial<Teacher>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    // Remove id from update data
    const updateData = { ...teacherData };
    delete updateData.id;
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating teacher:', error);
    throw error;
  }
}

// Delete teacher (soft delete)
export async function deleteTeacher(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { isActive: false });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    throw error;
  }
}

// Check if email exists
export async function checkTeacherEmailExists(email: string, excludeId?: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('email', '==', email.toLowerCase())
    );
    const querySnapshot = await getDocs(q);
    
    if (excludeId) {
      return querySnapshot.docs.some(doc => doc.id !== excludeId);
    }
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking teacher email:', error);
    throw error;
  }
}

// Get teacher statistics
export async function getTeacherStats(teacherId: string): Promise<{
  totalClasses: number;
  activeClasses: number;
  totalStudents: number;
}> {
  // This will be implemented when we have the classes system
  return {
    totalClasses: 0,
    activeClasses: 0,
    totalStudents: 0,
  };
}