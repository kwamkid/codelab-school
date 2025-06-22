// lib/services/admin-users.ts
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { AdminUser } from '@/types/models';
import { 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

// Get all admin users
export async function getAdminUsers(): Promise<AdminUser[]> {
  try {
    const q = query(
      collection(db, 'adminUsers'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate()
    } as AdminUser));
  } catch (error) {
    console.error('Error getting admin users:', error);
    throw error;
  }
}

// Get admin user by ID
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  try {
    const docRef = doc(db, 'adminUsers', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate()
    } as AdminUser;
  } catch (error) {
    console.error('Error getting admin user:', error);
    throw error;
  }
}

// Create new admin user
export async function createAdminUser(
  email: string,
  password: string,
  userData: Omit<AdminUser, 'id' | 'email' | 'createdAt' | 'updatedAt'>,
  createdBy: string,
  authToken: string // เพิ่ม parameter นี้
): Promise<string> {
  try {
    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}` // ส่ง token
      },
      body: JSON.stringify({
        email,
        password,
        userData,
        createdBy
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create user');
    }
    
    return result.userId;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

// Update admin user
export async function updateAdminUser(
  userId: string,
  data: Partial<AdminUser>,
  updatedBy: string
): Promise<void> {
  try {
    const docRef = doc(db, 'adminUsers', userId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
      updatedBy
    });
  } catch (error) {
    console.error('Error updating admin user:', error);
    throw error;
  }
}

// Send password reset email
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset:', error);
    throw error;
  }
}

// Check if email already exists
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'adminUsers'),
      where('email', '==', email)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
}

// เพิ่มฟังก์ชันนี้
export async function createAdminUserSimple(
  userId: string, // User ID ที่สร้างจาก Firebase Auth Console
  userData: {
    email: string;
    displayName: string;
    role: 'super_admin' | 'branch_admin' | 'teacher';
    branchIds: string[];
    permissions?: {
      canManageUsers?: boolean;
      canManageSettings?: boolean;
      canViewReports?: boolean;
      canManageAllBranches?: boolean;
    };
    isActive: boolean;
  },
  createdBy: string
): Promise<void> {
  try {
    await setDoc(doc(db, 'adminUsers', userId), {
      ...userData,
      createdAt: serverTimestamp(),
      createdBy,
      updatedAt: serverTimestamp(),
      updatedBy: createdBy
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}