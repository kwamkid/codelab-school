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
import { Subject } from '@/types/models';

const COLLECTION_NAME = 'subjects';

// Get all subjects
export async function getSubjects(): Promise<Subject[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Subject));
  } catch (error) {
    console.error('Error getting subjects:', error);
    throw error;
  }
}

// Get active subjects only
export async function getActiveSubjects(): Promise<Subject[]> {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    const subjects = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Subject));
    
    // Filter active subjects in memory
    return subjects
      .filter(subject => subject.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting active subjects:', error);
    throw error;
  }
}

// Get subjects by category
export async function getSubjectsByCategory(category: string): Promise<Subject[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('category', '==', category),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Subject));
  } catch (error) {
    console.error('Error getting subjects by category:', error);
    throw error;
  }
}

// Get single subject
export async function getSubject(id: string): Promise<Subject | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Subject;
    }
    return null;
  } catch (error) {
    console.error('Error getting subject:', error);
    throw error;
  }
}

// Create new subject
export async function createSubject(subjectData: Omit<Subject, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), subjectData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating subject:', error);
    throw error;
  }
}

// Update subject
export async function updateSubject(id: string, subjectData: Partial<Subject>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    // Remove id from update data
    const updateData = { ...subjectData };
    delete updateData.id;
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating subject:', error);
    throw error;
  }
}

// Delete subject (soft delete)
export async function deleteSubject(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { isActive: false });
  } catch (error) {
    console.error('Error deleting subject:', error);
    throw error;
  }
}

// Check if subject code exists
export async function checkSubjectCodeExists(code: string, excludeId?: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('code', '==', code.toUpperCase())
    );
    const querySnapshot = await getDocs(q);
    
    if (excludeId) {
      return querySnapshot.docs.some(doc => doc.id !== excludeId);
    }
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking subject code:', error);
    throw error;
  }
}

// Get subject count by category
export async function getSubjectCountByCategory(): Promise<Record<string, number>> {
  try {
    const subjects = await getActiveSubjects();
    const counts: Record<string, number> = {};
    
    subjects.forEach(subject => {
      counts[subject.category] = (counts[subject.category] || 0) + 1;
    });
    
    return counts;
  } catch (error) {
    console.error('Error getting subject count by category:', error);
    return {};
  }
}