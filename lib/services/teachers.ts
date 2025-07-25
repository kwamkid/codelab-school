import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Teacher } from '@/types/models';
import { createAdminUserSimple } from './admin-users';
import { auth } from '@/lib/firebase/client';

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

// Create new teacher WITH dual creation (teachers + adminUsers)
export async function createTeacher(teacherData: Omit<Teacher, 'id'>): Promise<string> {
  try {
    // 1. สร้าง Teacher ใน teachers collection ก่อน
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...teacherData,
      createdAt: serverTimestamp()
    });
    
    const teacherId = docRef.id;
    
    // 2. สร้าง AdminUser ด้วย ID เดียวกัน (Dual Creation)
    try {
      await createAdminUserSimple(
        teacherId, // ใช้ teacher ID เป็น user ID
        {
          email: teacherData.email,
          displayName: teacherData.name,
          role: 'teacher',
          branchIds: teacherData.availableBranches,
          permissions: {
            canManageUsers: false,
            canManageSettings: false,
            canViewReports: false,
            canManageAllBranches: false
          },
          isActive: teacherData.isActive
        },
        'system' // created by system during teacher creation
      );
    } catch (adminError) {
      console.error('Error creating admin user for teacher:', adminError);
      // ไม่ต้อง throw error - teacher ถูกสร้างแล้ว แต่ login ไม่ได้
      // Admin สามารถเพิ่มสิทธิ์ทีหลังได้
    }
    
    return teacherId;
  } catch (error) {
    console.error('Error creating teacher:', error);
    throw error;
  }
}

// Update teacher WITH dual update AND Firebase Auth update
export async function updateTeacher(id: string, teacherData: Partial<Teacher>): Promise<void> {
  try {
    // Check if email is being updated
    let emailUpdateResult = null;
    if (teacherData.email) {
      // Get current teacher data to compare
      const currentTeacher = await getTeacher(id);
      
      if (currentTeacher && currentTeacher.email !== teacherData.email) {
        // Email is changing - update Firebase Auth first
        try {
          const token = await auth.currentUser?.getIdToken();
          if (token) {
            const response = await fetch('/api/admin/update-teacher-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                teacherId: id,
                newEmail: teacherData.email
              })
            });
            
            emailUpdateResult = await response.json();
            
            if (!response.ok && !emailUpdateResult.needsAuthCreation) {
              // If it's not just "needs auth creation", throw error
              throw new Error(emailUpdateResult.message || 'Failed to update email in Firebase Auth');
            }
          }
        } catch (error: any) {
          console.error('Error updating Firebase Auth email:', error);
          // If it's a critical error (like email already exists), throw
          if (error.message?.includes('already exists')) {
            throw error;
          }
          // Otherwise, continue with Firestore update
        }
      }
    }
    
    // Now update Firestore
    const batch = writeBatch(db);
    
    // 1. Update teacher document
    const teacherRef = doc(db, COLLECTION_NAME, id);
    const updateData = { ...teacherData };
    delete updateData.id;
    
    batch.update(teacherRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    // 2. Update adminUser ถ้ามีการเปลี่ยนแปลงข้อมูลที่เกี่ยวข้อง
    const adminUserRef = doc(db, 'adminUsers', id);
    const adminUserDoc = await getDoc(adminUserRef);
    
    if (adminUserDoc.exists()) {
      const adminUpdateData: any = {
        updatedAt: serverTimestamp()
      };
      
      // Update fields ที่มีผลกับ adminUser
      if (teacherData.name !== undefined) {
        adminUpdateData.displayName = teacherData.name;
      }
      if (teacherData.email !== undefined) {
        adminUpdateData.email = teacherData.email;
      }
      if (teacherData.availableBranches !== undefined) {
        adminUpdateData.branchIds = teacherData.availableBranches;
      }
      if (teacherData.isActive !== undefined) {
        adminUpdateData.isActive = teacherData.isActive;
      }
      
      batch.update(adminUserRef, adminUpdateData);
    }
    
    // Commit both updates
    await batch.commit();
    
    // If email was updated but teacher doesn't have Firebase Auth yet
    if (emailUpdateResult?.needsAuthCreation) {
      console.log('Note: Teacher email updated but Firebase Auth account not created yet');
    }
  } catch (error) {
    console.error('Error updating teacher:', error);
    throw error;
  }
}

// Delete teacher (soft delete) - ปิดการใช้งานทั้ง 2 collections
export async function deleteTeacher(id: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    
    // 1. Soft delete teacher
    const teacherRef = doc(db, COLLECTION_NAME, id);
    batch.update(teacherRef, { 
      isActive: false,
      updatedAt: serverTimestamp()
    });
    
    // 2. Soft delete adminUser
    const adminUserRef = doc(db, 'adminUsers', id);
    const adminUserDoc = await getDoc(adminUserRef);
    
    if (adminUserDoc.exists()) {
      batch.update(adminUserRef, { 
        isActive: false,
        updatedAt: serverTimestamp()
      });
    }
    
    await batch.commit();
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

// Sync existing teachers to adminUsers AND create Firebase Auth users
export async function syncTeachersToAdminUsers(): Promise<{
  success: number;
  failed: number;
  errors: string[];
  needsAuthCreation: string[]; // Teacher IDs that need Firebase Auth creation
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
    needsAuthCreation: [] as string[]
  };
  
  try {
    const teachers = await getTeachers();
    const teachersNeedingAuth: string[] = [];
    
    // Phase 1: Create adminUsers documents
    for (const teacher of teachers) {
      try {
        // Check if adminUser already exists
        const adminUserRef = doc(db, 'adminUsers', teacher.id);
        const adminUserDoc = await getDoc(adminUserRef);
        
        if (!adminUserDoc.exists()) {
          // Create adminUser for existing teacher
          await createAdminUserSimple(
            teacher.id,
            {
              email: teacher.email,
              displayName: teacher.name,
              role: 'teacher',
              branchIds: teacher.availableBranches,
              permissions: {
                canManageUsers: false,
                canManageSettings: false,
                canViewReports: false,
                canManageAllBranches: false
              },
              isActive: teacher.isActive
            },
            'migration'
          );
          teachersNeedingAuth.push(teacher.id);
          results.success++;
        } else {
          // Check if needs auth creation
          const data = adminUserDoc.data();
          if (!data.authCreated) {
            teachersNeedingAuth.push(teacher.id);
          }
          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to sync teacher ${teacher.name}: ${error}`);
      }
    }
    
    // Phase 2: Create Firebase Auth users (if any)
    if (teachersNeedingAuth.length > 0) {
      try {
        // Get current user token
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          throw new Error('No auth token available');
        }
        
        // Call API to create auth users
        const response = await fetch('/api/admin/migrate-teachers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            teacherIds: teachersNeedingAuth
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create auth users');
        }
        
        const authResult = await response.json();
        console.log('Auth creation result:', authResult);
        
        // Update needsAuthCreation list based on results
        results.needsAuthCreation = authResult.results.failed.map((f: any) => f.id);
        
      } catch (error) {
        console.error('Error creating auth users:', error);
        results.errors.push(`Failed to create Firebase Auth users: ${error}`);
        results.needsAuthCreation = teachersNeedingAuth;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error syncing teachers:', error);
    throw error;
  }
}