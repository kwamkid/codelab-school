// lib/services/factory-reset.ts

import { 
  collection, 
  getDocs, 
  deleteDoc,
  writeBatch,
  doc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

interface CollectionInfo {
  name: string;
  hasSubcollections?: {
    field: string;
    subcollection: string;
  }[];
}

// รายการ collections ที่ต้องลบ
const COLLECTIONS_TO_DELETE: CollectionInfo[] = [
  {
    name: 'branches',
    hasSubcollections: [{
      field: 'id',
      subcollection: 'rooms'
    }]
  },
  {
    name: 'parents',
    hasSubcollections: [{
      field: 'id',
      subcollection: 'students'
    }]
  },
  {
    name: 'teachers'
  },
  {
    name: 'subjects'
  },
  {
    name: 'classes',
    hasSubcollections: [{
      field: 'id',
      subcollection: 'schedules'
    }]
  },
  {
    name: 'enrollments'
  },
  {
    name: 'holidays'
  },
  {
    name: 'makeupClasses'
  },
  {
    name: 'trialBookings'
  },
  {
    name: 'promotions'
  },
  {
    name: 'notifications'
  },
  {
    name: 'settings'
  },
  {
    name: 'auditLogs'
  },
  {
    name: 'deletionLogs'
  }
];

// ลบ subcollection
async function deleteSubcollection(
  parentDocId: string,
  parentCollection: string,
  subcollectionName: string
): Promise<number> {
  let deletedCount = 0;
  const subcollectionRef = collection(db, parentCollection, parentDocId, subcollectionName);
  const snapshot = await getDocs(subcollectionRef);
  
  const batch = writeBatch(db);
  let batchCount = 0;
  
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    batchCount++;
    deletedCount++;
    
    // Firestore batch limit is 500
    if (batchCount === 500) {
      await batch.commit();
      batchCount = 0;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
  }
  
  return deletedCount;
}

// ลบ collection ทั้งหมด
async function deleteCollection(collectionInfo: CollectionInfo): Promise<{
  collection: string;
  documentsDeleted: number;
  subcollectionsDeleted: number;
}> {
  console.log(`Deleting collection: ${collectionInfo.name}`);
  
  let documentsDeleted = 0;
  let subcollectionsDeleted = 0;
  
  try {
    const collectionRef = collection(db, collectionInfo.name);
    const snapshot = await getDocs(collectionRef);
    
    console.log(`Found ${snapshot.size} documents in ${collectionInfo.name}`);
    
    // ถ้ามี subcollections ต้องลบ subcollections ก่อน
    if (collectionInfo.hasSubcollections) {
      for (const doc of snapshot.docs) {
        for (const subInfo of collectionInfo.hasSubcollections) {
          const subDeleted = await deleteSubcollection(
            doc.id,
            collectionInfo.name,
            subInfo.subcollection
          );
          subcollectionsDeleted += subDeleted;
        }
      }
    }
    
    // ลบ documents ใน collection หลัก
    const batch = writeBatch(db);
    let batchCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      batch.delete(docSnapshot.ref);
      batchCount++;
      documentsDeleted++;
      
      if (batchCount === 500) {
        await batch.commit();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`Deleted ${documentsDeleted} documents from ${collectionInfo.name}`);
    
  } catch (error) {
    console.error(`Error deleting collection ${collectionInfo.name}:`, error);
  }
  
  return {
    collection: collectionInfo.name,
    documentsDeleted,
    subcollectionsDeleted
  };
}

// Factory Reset - ลบข้อมูลทั้งหมด
export async function factoryReset(): Promise<{
  success: boolean;
  summary: {
    collection: string;
    documentsDeleted: number;
    subcollectionsDeleted: number;
  }[];
  totalDocumentsDeleted: number;
  totalSubcollectionsDeleted: number;
  error?: string;
}> {
  console.log('Starting factory reset...');
  
  try {
    const summary: {
      collection: string;
      documentsDeleted: number;
      subcollectionsDeleted: number;
    }[] = [];
    
    let totalDocumentsDeleted = 0;
    let totalSubcollectionsDeleted = 0;
    
    // ลบทุก collection
    for (const collectionInfo of COLLECTIONS_TO_DELETE) {
      const result = await deleteCollection(collectionInfo);
      summary.push(result);
      totalDocumentsDeleted += result.documentsDeleted;
      totalSubcollectionsDeleted += result.subcollectionsDeleted;
    }
    
    // Sign out user
    await signOut(auth);
    
    console.log('Factory reset completed successfully');
    console.log(`Total documents deleted: ${totalDocumentsDeleted}`);
    console.log(`Total subcollection documents deleted: ${totalSubcollectionsDeleted}`);
    
    return {
      success: true,
      summary,
      totalDocumentsDeleted,
      totalSubcollectionsDeleted
    };
    
  } catch (error) {
    console.error('Factory reset failed:', error);
    return {
      success: false,
      summary: [],
      totalDocumentsDeleted: 0,
      totalSubcollectionsDeleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// ตรวจสอบจำนวนข้อมูลก่อนลบ (optional - for confirmation)
export async function getDataSummary(): Promise<{
  collection: string;
  documentCount: number;
  subcollectionCount: number;
}[]> {
  const summary = [];
  
  for (const collectionInfo of COLLECTIONS_TO_DELETE) {
    try {
      const collectionRef = collection(db, collectionInfo.name);
      const snapshot = await getDocs(collectionRef);
      
      let subcollectionCount = 0;
      
      if (collectionInfo.hasSubcollections) {
        for (const doc of snapshot.docs) {
          for (const subInfo of collectionInfo.hasSubcollections) {
            const subcollectionRef = collection(
              db, 
              collectionInfo.name, 
              doc.id, 
              subInfo.subcollection
            );
            const subSnapshot = await getDocs(subcollectionRef);
            subcollectionCount += subSnapshot.size;
          }
        }
      }
      
      summary.push({
        collection: collectionInfo.name,
        documentCount: snapshot.size,
        subcollectionCount
      });
      
    } catch (error) {
      console.error(`Error getting summary for ${collectionInfo.name}:`, error);
      summary.push({
        collection: collectionInfo.name,
        documentCount: 0,
        subcollectionCount: 0
      });
    }
  }
  
  return summary;
}

// สร้างข้อมูลเริ่มต้นหลัง factory reset (optional)
export async function createInitialData(): Promise<void> {
  try {
    // สร้างข้อมูลเริ่มต้นที่จำเป็น
    const batch = writeBatch(db);
    
    // 1. สร้าง default settings
    const settingsRef = doc(db, 'settings', 'general');
    batch.set(settingsRef, {
      schoolName: 'CodeLab School',
      email: 'info@codelabschool.com',
      phone: '02-123-4567',
      address: '',
      primaryColor: '#EF4444',
      createdAt: new Date()
    });
    
    // 2. สร้าง default payment methods
    const cashRef = doc(collection(db, 'settings', 'paymentMethods'));
    batch.set(cashRef, {
      name: 'เงินสด',
      type: 'cash',
      isActive: true
    });
    
    const transferRef = doc(collection(db, 'settings', 'paymentMethods'));
    batch.set(transferRef, {
      name: 'โอนเงิน',
      type: 'transfer',
      isActive: true
    });
    
    await batch.commit();
    console.log('Initial data created successfully');
    
  } catch (error) {
    console.error('Error creating initial data:', error);
  }
}