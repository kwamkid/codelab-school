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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Branch } from '@/types/models';

const COLLECTION_NAME = 'branches';

// Get all branches
export async function getBranches(): Promise<Branch[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('name', 'asc')
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
    // Get all branches first
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    const branches = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as Branch));
    
    // Filter active branches in memory
    return branches
      .filter(branch => branch.isActive === true)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting active branches:', error);
    // Return empty array instead of throwing
    return [];
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
      createdAt: serverTimestamp(),
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
    
    // Remove id and createdAt from update data
    const updateData = { ...branchData };
    delete updateData.id;
    delete updateData.createdAt;
    
    if (Object.keys(updateData).length === 0) {
      return; // Nothing to update
    }
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating branch:', error);
    throw error;
  }
}

// Toggle branch active status
export async function toggleBranchStatus(id: string, isActive: boolean): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { isActive });
  } catch (error) {
    console.error('Error toggling branch status:', error);
    throw error;
  }
}

// Check if branch code already exists
export async function checkBranchCodeExists(
  code: string, 
  excludeId?: string
): Promise<boolean> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('code', '==', code)
    );
    const querySnapshot = await getDocs(q);
    
    if (excludeId) {
      // If we're updating, exclude the current branch from the check
      return querySnapshot.docs.some(doc => doc.id !== excludeId);
    }
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking branch code:', error);
    throw error;
  }
}

// Get branches by IDs
export async function getBranchesByIds(ids: string[]): Promise<Branch[]> {
  try {
    if (ids.length === 0) return [];
    
    const branches: Branch[] = [];
    
    // Firestore 'in' query has a limit of 10 items
    const chunks = [];
    for (let i = 0; i < ids.length; i += 10) {
      chunks.push(ids.slice(i, i + 10));
    }
    
    for (const chunk of chunks) {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('__name__', 'in', chunk)
      );
      const querySnapshot = await getDocs(q);
      
      querySnapshot.docs.forEach(doc => {
        branches.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        } as Branch);
      });
    }
    
    return branches;
  } catch (error) {
    console.error('Error getting branches by IDs:', error);
    throw error;
  }
}