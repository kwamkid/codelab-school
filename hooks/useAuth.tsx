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
import { AdminUser, Teacher } from '@/types/models';

interface AuthContextType {
  user: User | null;
  adminUser: AdminUser | null;
  teacher: Teacher | null; // เพิ่ม teacher data
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  canAccessBranch: (branchId: string) => boolean;
  isSuperAdmin: () => boolean;
  isBranchAdmin: () => boolean; // เพิ่ม function นี้
  canManageSettings: () => boolean;
  isTeacher: () => boolean; // เพิ่ม helper function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
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
            
            // ตรวจสอบและเพิ่ม default permissions สำหรับ super_admin
            let permissions = data.permissions || {};
            if (data.role === 'super_admin') {
              permissions = {
                canManageUsers: true,
                canManageSettings: true,
                canViewReports: true,
                canManageAllBranches: true,
                ...permissions
              };
            }
            
            const adminUserData = {
              id: docSnap.id,
              ...data,
              permissions,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate()
            } as AdminUser;
            
            setAdminUser(adminUserData);
            
            // ถ้าเป็น teacher ให้โหลดข้อมูลจาก teachers collection ด้วย
            if (data.role === 'teacher') {
              try {
                const teacherRef = doc(db, 'teachers', user.uid);
                const teacherSnap = await getDoc(teacherRef);
                
                if (teacherSnap.exists()) {
                  setTeacher({
                    id: teacherSnap.id,
                    ...teacherSnap.data()
                  } as Teacher);
                }
              } catch (error) {
                console.error('Error loading teacher data:', error);
              }
            }
          } else {
            // ถ้าไม่มีข้อมูลใน adminUsers ให้สร้าง default super_admin
            // (สำหรับ admin คนแรก)
            setAdminUser({
              id: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email || '',
              role: 'super_admin',
              branchIds: [],
              permissions: {
                canManageUsers: true,
                canManageSettings: true,
                canViewReports: true,
                canManageAllBranches: true
              },
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
        setTeacher(null);
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
      setTeacher(null); // Clear teacher data
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

  const isSuperAdmin = () => {
    return adminUser?.role === 'super_admin';
  };

  const isBranchAdmin = () => {
    return adminUser?.role === 'branch_admin';
  };

  const canManageSettings = () => {
    if (!adminUser) return false;
    if (adminUser.role === 'super_admin') return true;
    return adminUser.permissions?.canManageSettings || false;
  };

  const isTeacher = () => {
    return adminUser?.role === 'teacher';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      adminUser,
      teacher, // เพิ่ม teacher ใน context
      loading, 
      signIn, 
      signOut,
      canAccessBranch,
      isSuperAdmin,
      isBranchAdmin, // เพิ่ม function นี้
      canManageSettings,
      isTeacher // เพิ่ม helper function
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