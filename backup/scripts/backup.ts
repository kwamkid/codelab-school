// backup/scripts/backup.ts
import { adminDb } from '@/lib/firebase/admin';
import * as fs from 'fs';
import * as path from 'path';

interface BackupOptions {
  outputDir?: string;
  collections?: string[];
  includeSubcollections?: boolean;
}

// Collections ทั้งหมดในระบบ
const ALL_COLLECTIONS = [
  'branches',
  'parents',
  'subjects',
  'teachers',
  'classes',
  'enrollments',
  'promotions',
  'holidays',
  'makeupClasses',
  'trialBookings',
  'notifications',
  'settings',
  'adminUsers',
  'rooms',
  'teachingMaterials',
  'events',
  'eventSchedules',
  'eventRegistrations',
  'linkTokens'
];

// แปลง Firestore data ให้เป็น JSON serializable
function serializeData(data: any): any {
  if (data === null || data === undefined) {
    return null;
  }

  if (data instanceof Date) {
    return { _type: 'timestamp', value: data.toISOString() };
  }

  if (data && typeof data.toDate === 'function') {
    return { _type: 'timestamp', value: data.toDate().toISOString() };
  }

  if (data && data._latitude !== undefined && data._longitude !== undefined) {
    return { _type: 'geopoint', latitude: data._latitude, longitude: data._longitude };
  }

  if (Array.isArray(data)) {
    return data.map(serializeData);
  }

  if (typeof data === 'object') {
    const result: any = {};
    for (const key in data) {
      result[key] = serializeData(data[key]);
    }
    return result;
  }

  return data;
}

// Backup subcollections
async function backupSubcollections(
  docRef: FirebaseFirestore.DocumentReference,
  parentPath: string
): Promise<any> {
  const subcollections: any = {};
  
  try {
    // ตรวจสอบ subcollections ที่อาจมี
    const knownSubcollections: { [key: string]: string[] } = {
      'branches': ['rooms'],
      'parents': ['students'],
      'teachers': ['availability'],
      'classes': ['schedules'],
      'notifications': ['messages']
    };

    const collectionName = docRef.parent.id;
    const possibleSubs = knownSubcollections[collectionName] || [];

    for (const subName of possibleSubs) {
      try {
        const subCollectionRef = docRef.collection(subName);
        const snapshot = await subCollectionRef.get();
        
        if (!snapshot.empty) {
          subcollections[subName] = [];
          
          for (const subDoc of snapshot.docs) {
            const subData = {
              id: subDoc.id,
              ...serializeData(subDoc.data())
            };
            
            subcollections[subName].push(subData);
          }
          
          console.log(`  └─ Backed up subcollection: ${parentPath}/${subName} (${snapshot.size} docs)`);
        }
      } catch (error) {
        // Skip ถ้าไม่มี subcollection นี้
      }
    }
  } catch (error) {
    console.error(`Error backing up subcollections for ${parentPath}:`, error);
  }

  return Object.keys(subcollections).length > 0 ? subcollections : undefined;
}

// Backup single collection
async function backupCollection(
  collectionName: string,
  includeSubcollections: boolean = true
): Promise<any[]> {
  console.log(`\n📦 Backing up collection: ${collectionName}`);
  
  try {
    const snapshot = await adminDb.collection(collectionName).get();
    const documents: any[] = [];

    console.log(`  Found ${snapshot.size} documents`);

    for (const doc of snapshot.docs) {
      const data = {
        id: doc.id,
        ...serializeData(doc.data())
      };

      // Backup subcollections if needed
      if (includeSubcollections) {
        const subcollections = await backupSubcollections(doc.ref, `${collectionName}/${doc.id}`);
        if (subcollections) {
          data._subcollections = subcollections;
        }
      }

      documents.push(data);
    }

    console.log(`  ✅ Completed: ${collectionName}`);
    return documents;
  } catch (error) {
    console.error(`  ❌ Error backing up ${collectionName}:`, error);
    return [];
  }
}

// Main backup function
export async function backupFirestore(options: BackupOptions = {}) {
  const {
    outputDir = './backup/data',
    collections = ALL_COLLECTIONS,
    includeSubcollections = true
  } = options;

  console.log('🚀 Starting Firestore Backup...\n');
  console.log(`📁 Output directory: ${outputDir}`);
  console.log(`📋 Collections to backup: ${collections.join(', ')}\n`);

  // สร้าง directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const timeString = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const backupDir = path.join(outputDir, `backup-${timestamp}-${timeString}`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    collections: {}
  };

  // Backup แต่ละ collection
  for (const collectionName of collections) {
    try {
      const documents = await backupCollection(collectionName, includeSubcollections);
      
      // บันทึกเป็นไฟล์แยก
      const filePath = path.join(backupDir, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
      
      results.collections[collectionName] = {
        count: documents.length,
        file: filePath
      };
    } catch (error) {
      console.error(`Error processing ${collectionName}:`, error);
      results.collections[collectionName] = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // บันทึก metadata
  const metadataPath = path.join(backupDir, '_metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(results, null, 2));

  console.log('\n✅ Backup completed successfully!');
  console.log(`📁 Backup location: ${backupDir}`);
  console.log('\nSummary:');
  
  let totalDocs = 0;
  for (const [collection, info] of Object.entries(results.collections)) {
    if ('count' in (info as any)) {
      const count = (info as any).count;
      totalDocs += count;
      console.log(`  - ${collection}: ${count} documents`);
    }
  }
  
  console.log(`\n📊 Total documents backed up: ${totalDocs}`);
  console.log(`\n💾 Backup name: ${path.basename(backupDir)}`);

  return backupDir;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: BackupOptions = {};

  // Parse arguments
  if (args.includes('--collections')) {
    const idx = args.indexOf('--collections');
    options.collections = args[idx + 1]?.split(',');
  }

  if (args.includes('--output')) {
    const idx = args.indexOf('--output');
    options.outputDir = args[idx + 1];
  }

  if (args.includes('--no-subcollections')) {
    options.includeSubcollections = false;
  }

  backupFirestore(options)
    .then((backupDir) => {
      console.log('\n🎉 Backup process finished!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Backup failed:', error);
      process.exit(1);
    });
}