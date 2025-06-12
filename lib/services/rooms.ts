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
import { Room } from '@/types/models';

// Get all rooms for a branch
export async function getRoomsByBranch(branchId: string): Promise<Room[]> {
  try {
    const roomsRef = collection(db, 'branches', branchId, 'rooms');
    const q = query(roomsRef, orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      branchId,
      ...doc.data()
    } as Room));
  } catch (error) {
    console.error('Error getting rooms:', error);
    throw error;
  }
}

// Get active rooms only
export async function getActiveRoomsByBranch(branchId: string): Promise<Room[]> {
  try {
    const roomsRef = collection(db, 'branches', branchId, 'rooms');
    const querySnapshot = await getDocs(roomsRef);
    
    const rooms = querySnapshot.docs.map(doc => ({
      id: doc.id,
      branchId,
      ...doc.data()
    } as Room));
    
    // Filter active rooms in memory
    return rooms
      .filter(room => room.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting active rooms:', error);
    throw error;
  }
}

// Get single room
export async function getRoom(branchId: string, roomId: string): Promise<Room | null> {
  try {
    const docRef = doc(db, 'branches', branchId, 'rooms', roomId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        branchId,
        ...docSnap.data()
      } as Room;
    }
    return null;
  } catch (error) {
    console.error('Error getting room:', error);
    throw error;
  }
}

// Create new room
export async function createRoom(
  branchId: string, 
  roomData: Omit<Room, 'id' | 'branchId'>
): Promise<string> {
  try {
    const roomsRef = collection(db, 'branches', branchId, 'rooms');
    const docRef = await addDoc(roomsRef, roomData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
}

// Update room
export async function updateRoom(
  branchId: string,
  roomId: string, 
  roomData: Partial<Room>
): Promise<void> {
  try {
    const docRef = doc(db, 'branches', branchId, 'rooms', roomId);
    // Remove id and branchId from update data
    const updateData = { ...roomData };
    delete updateData.id;
    delete updateData.branchId;
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating room:', error);
    throw error;
  }
}

// Delete room (soft delete)
export async function deleteRoom(branchId: string, roomId: string): Promise<void> {
  try {
    const docRef = doc(db, 'branches', branchId, 'rooms', roomId);
    await updateDoc(docRef, { isActive: false });
  } catch (error) {
    console.error('Error deleting room:', error);
    throw error;
  }
}

// Check if room name exists in branch
export async function checkRoomNameExists(
  branchId: string,
  name: string,
  excludeId?: string
): Promise<boolean> {
  try {
    const roomsRef = collection(db, 'branches', branchId, 'rooms');
    const q = query(roomsRef, where('name', '==', name));
    const querySnapshot = await getDocs(q);
    
    if (excludeId) {
      return querySnapshot.docs.some(doc => doc.id !== excludeId);
    }
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking room name:', error);
    throw error;
  }
}

// Get room count for branch
export async function getRoomCount(branchId: string): Promise<number> {
  try {
    const roomsRef = collection(db, 'branches', branchId, 'rooms');
    const q = query(roomsRef, where('isActive', '==', true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting room count:', error);
    return 0;
  }
}