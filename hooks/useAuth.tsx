'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { AdminUser } from '@/types/models';

interface AuthContextType {
  user: User | null;
  adminUser: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  canAccessBranch: (branchId: string) => boolean;
  isSuperAdmin: () => boolean;
  canManageSettings: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Load admin user data
        try {
          const docRef = doc(db, 'adminUsers', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setAdminUser({
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate()
            } as AdminUser);
          } else {
            // ถ้าไม่มีข้อมูลใน adminUsers ให้สร้าง default super_admin
            // (สำหรับ admin คนแรก)
            setAdminUser({
              id: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email || '',
              role: 'super_admin',
              branchIds: [],
              isActive: true,
              createdAt: new Date(),
              createdBy: 'system'
            });
          }
        } catch (error) {
          console.error('Error loading admin user:', error);
        }
      } else {
        setAdminUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user is active admin
      const docRef = doc(db, 'adminUsers', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && !docSnap.data()?.isActive) {
        await firebaseSignOut(auth);
        throw new Error('บัญชีถูกระงับการใช้งาน');
      }
      
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error.message === 'บัญชีถูกระงับการใช้งาน') {
        throw error;
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const canAccessBranch = (branchId: string) => {
    if (!adminUser) return false;
    if (adminUser.role === 'super_admin') return true;
    if (adminUser.branchIds.length === 0) return true; // empty = all branches
    return adminUser.branchIds.includes(branchId);
  };

  const isSuperAdmin = () => adminUser?.role === 'super_admin';

  const canManageSettings = () => {
    if (!adminUser) return false;
    if (isSuperAdmin()) return true;
    return adminUser.permissions?.canManageSettings || false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      adminUser,
      loading, 
      signIn, 
      signOut,
      canAccessBranch,
      isSuperAdmin,
      canManageSettings
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}