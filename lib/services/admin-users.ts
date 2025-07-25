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

// Get all admin users with optional branch filter (excluding teachers)
export async function getAdminUsers(branchId?: string): Promise<AdminUser[]> {
  try {
    let q = query(
      collection(db, 'adminUsers'),
      where('role', 'in', ['super_admin', 'branch_admin']), // ดึงเฉพาะ admin roles
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    let users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate()
    } as AdminUser));
    
    // Filter by branch if specified
    if (branchId) {
      users = users.filter(user => {
        // Super admin can see all
        if (user.role === 'super_admin') return true;
        // Check if user has access to this branch
        return user.branchIds.length === 0 || user.branchIds.includes(branchId);
      });
    }
    
    return users;
  } catch (error) {
    console.error('Error getting admin users:', error);
    throw error;
  }
}

// Get admin users by role
export async function getAdminUsersByRole(
  role: 'super_admin' | 'branch_admin' | 'teacher',
  branchId?: string
): Promise<AdminUser[]> {
  try {
    const q = query(
      collection(db, 'adminUsers'),
      where('role', '==', role),
      where('isActive', '==', true),
      orderBy('displayName', 'asc')
    );
    
    const snapshot = await getDocs(q);
    let users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate()
    } as AdminUser));
    
    // Filter by branch if specified
    if (branchId && role !== 'super_admin') {
      users = users.filter(user => 
        user.branchIds.length === 0 || user.branchIds.includes(branchId)
      );
    }
    
    return users;
  } catch (error) {
    console.error('Error getting admin users by role:', error);
    return [];
  }
}

// Get teachers for a specific branch
export async function getTeachersForBranch(branchId: string): Promise<AdminUser[]> {
  try {
    const q = query(
      collection(db, 'adminUsers'),
      where('role', '==', 'teacher'),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    const teachers = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate()
      } as AdminUser))
      .filter(teacher => 
        teacher.branchIds.length === 0 || teacher.branchIds.includes(branchId)
      );
    
    return teachers;
  } catch (error) {
    console.error('Error getting teachers for branch:', error);
    return [];
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
  userData: Omit<AdminUser, 'id' | 'email' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
  createdBy: string,
  authToken: string
): Promise<string> {
  try {
    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        email,
        password,
        userData: {
          ...userData,
          email
        },
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

// Create admin user simple (สำหรับการ migration หรือสร้างด้วย manual)
export async function createAdminUserSimple(
  userId: string,
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

// Delete admin user
export async function deleteAdminUser(
  userId: string,
  deletedBy: string
): Promise<void> {
  try {
    const docRef = doc(db, 'adminUsers', userId);
    await updateDoc(docRef, {
      isActive: false,
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy
    });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    throw error;
  }
}