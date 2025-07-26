// lib/services/teaching-materials.ts

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
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { TeachingMaterial } from '@/types/models';
import { convertCanvaToEmbedUrl } from '@/lib/utils/canva';

const COLLECTION_NAME = 'teachingMaterials';

// Get all teaching materials for a subject
export async function getTeachingMaterials(subjectId: string): Promise<TeachingMaterial[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('subjectId', '==', subjectId),
      orderBy('sessionNumber', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate()
    } as TeachingMaterial));
  } catch (error) {
    console.error('Error getting teaching materials:', error);
    throw error;
  }
}

// Get single teaching material
export async function getTeachingMaterial(id: string): Promise<TeachingMaterial | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        updatedAt: docSnap.data().updatedAt?.toDate()
      } as TeachingMaterial;
    }
    return null;
  } catch (error) {
    console.error('Error getting teaching material:', error);
    throw error;
  }
}

// Check if session number already exists for a subject
export async function checkSessionNumberExists(
  subjectId: string, 
  sessionNumber: number,
  excludeId?: string
): Promise<{ exists: boolean; existingTitle?: string }> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('subjectId', '==', subjectId),
      where('sessionNumber', '==', sessionNumber)
    );
    
    const querySnapshot = await getDocs(q);
    
    // If we're updating, exclude the current material from the check
    if (excludeId) {
      const conflictingDoc = querySnapshot.docs.find(doc => doc.id !== excludeId);
      if (conflictingDoc) {
        return { 
          exists: true, 
          existingTitle: conflictingDoc.data().title 
        };
      }
      return { exists: false };
    }
    
    if (!querySnapshot.empty) {
      return { 
        exists: true, 
        existingTitle: querySnapshot.docs[0].data().title 
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Error checking session number:', error);
    throw error;
  }
}

// Create teaching material
export async function createTeachingMaterial(
  data: Omit<TeachingMaterial, 'id' | 'embedUrl' | 'createdAt' | 'updatedAt'>,
  createdBy: string
): Promise<string> {
  try {
    // Check if session number already exists
    const checkResult = await checkSessionNumberExists(data.subjectId, data.sessionNumber);
    if (checkResult.exists) {
      throw new Error(`ครั้งที่ ${data.sessionNumber} มีอยู่แล้ว (${checkResult.existingTitle}) กรุณาเลือกครั้งที่อื่น`);
    }
    
    // Auto-generate embed URL
    const embedUrl = convertCanvaToEmbedUrl(data.canvaUrl);
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      embedUrl,
      createdAt: serverTimestamp(),
      createdBy,
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating teaching material:', error);
    throw error;
  }
}

// Update teaching material
export async function updateTeachingMaterial(
  id: string,
  data: Partial<TeachingMaterial>,
  updatedBy: string
): Promise<void> {
  try {
    const updateData = { ...data };
    
    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.createdBy;
    
    // If session number is being updated, check for duplicates
    if (updateData.sessionNumber !== undefined && updateData.subjectId) {
      const checkResult = await checkSessionNumberExists(
        updateData.subjectId, 
        updateData.sessionNumber,
        id // exclude current material
      );
      if (checkResult.exists) {
        throw new Error(`ครั้งที่ ${updateData.sessionNumber} มีอยู่แล้ว (${checkResult.existingTitle}) กรุณาเลือกครั้งที่อื่น`);
      }
    }
    
    // If Canva URL is updated, regenerate embed URL
    if (updateData.canvaUrl) {
      updateData.embedUrl = convertCanvaToEmbedUrl(updateData.canvaUrl);
    }
    
    await updateDoc(doc(db, COLLECTION_NAME, id), {
      ...updateData,
      updatedAt: serverTimestamp(),
      updatedBy
    });
  } catch (error) {
    console.error('Error updating teaching material:', error);
    throw error;
  }
}

// Delete teaching material
export async function deleteTeachingMaterial(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error('Error deleting teaching material:', error);
    throw error;
  }
}

// Reorder teaching materials
export async function reorderTeachingMaterials(
  subjectId: string,
  materialIds: string[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    
    materialIds.forEach((materialId, index) => {
      const docRef = doc(db, COLLECTION_NAME, materialId);
      batch.update(docRef, {
        sessionNumber: index + 1,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error reordering materials:', error);
    throw error;
  }
}

// Duplicate teaching material
export async function duplicateTeachingMaterial(
  materialId: string,
  createdBy: string
): Promise<string> {
  try {
    const original = await getTeachingMaterial(materialId);
    if (!original) {
      throw new Error('Material not found');
    }
    
    // Get all materials to find available session number
    const materials = await getTeachingMaterials(original.subjectId);
    const existingNumbers = materials.map(m => m.sessionNumber);
    
    // Find the next available session number
    let newSessionNumber = 1;
    while (existingNumbers.includes(newSessionNumber)) {
      newSessionNumber++;
    }
    
    // Create copy
    const newData = {
      ...original,
      title: `${original.title} (Copy)`,
      sessionNumber: newSessionNumber
    };
    
    delete newData.id;
    delete newData.createdAt;
    delete newData.updatedAt;
    
    return await createTeachingMaterial(newData, createdBy);
  } catch (error) {
    console.error('Error duplicating material:', error);
    throw error;
  }
}

// Get active materials only
export async function getActiveTeachingMaterials(subjectId: string): Promise<TeachingMaterial[]> {
  try {
    const materials = await getTeachingMaterials(subjectId);
    return materials.filter(m => m.isActive);
  } catch (error) {
    console.error('Error getting active materials:', error);
    return [];
  }
}

// Get next available session number
export async function getNextSessionNumber(subjectId: string): Promise<number> {
  try {
    const materials = await getTeachingMaterials(subjectId);
    if (materials.length === 0) return 1;
    
    const maxNumber = Math.max(...materials.map(m => m.sessionNumber));
    return maxNumber + 1;
  } catch (error) {
    console.error('Error getting next session number:', error);
    return 1;
  }
}