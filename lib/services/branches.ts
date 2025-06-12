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
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Branch } from '@/types/models';

const COLLECTION_NAME = 'branches';

// Get all branches
export async function getBranches(): Promise<Branch[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('code', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as Branch));
  } catch (error) {
    console.error('Error getting branches:', error);
    throw error;
  }
}

// Get active branches only
export async function getActiveBranches(): Promise<Branch[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', true),
      orderBy('code', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as Branch));
  } catch (error) {
    console.error('Error getting active branches:', error);
    throw error;
  }
}

// Get single branch
export async function getBranch(id: string): Promise<Branch | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      } as Branch;
    }
    return null;
  } catch (error) {
    console.error('Error getting branch:', error);
    throw error;
  }
}

// Create new branch
export async function createBranch(branchData: Omit<Branch, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...branchData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating branch:', error);
    throw error;
  }
}

// Update branch
export async function updateBranch(id: string, branchData: Partial<Branch>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const { id: _, createdAt, ...updateData } = branchData;
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating branch:', error);
    throw error;
  }
}

// Delete branch (soft delete - just set isActive to false)
export async function deleteBranch(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { isActive: false });
  } catch (error) {
    console.error('Error deleting branch:', error);
    throw error;
  }
}

// Check if branch code already exists
export async function checkBranchCodeExists(code: string, excludeId?: string): Promise<boolean> {
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
    console.error('Error checking branch code:', error);
    throw error;
  }
}