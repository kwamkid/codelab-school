// backup/scripts/restore.ts
import 'dotenv/config';
import { adminDb } from '@/lib/firebase/admin';
import * as fs from 'fs';
import * as path from 'path';
import { Timestamp, GeoPoint } from 'firebase-admin/firestore';

interface RestoreOptions {
  backupDir: string;
  collections?: string[];
  dryRun?: boolean;
  overwrite?: boolean;
  clean?: boolean; // ใหม่: ลบข้อมูลทั้งหมดก่อน restore
  batchSize?: number;
}

// แปลง serialized data กลับเป็น Firestore types
function deserializeData(data: any): any {
  if (data === null || data === undefined) {
    return null;
  }

  // Timestamp
  if (data && data._type === 'timestamp') {
    return Timestamp.fromDate(new Date(data.value));
  }

  // GeoPoint
  if (data && data._type === 'geopoint') {
    return new GeoPoint(data.latitude, data.longitude);
  }

  // Array
  if (Array.isArray(data)) {
    return data.map(deserializeData);
  }

  // Object
  if (typeof data === 'object') {
    const result: any = {};
    for (const key in data) {
      // ข้าม special keys
      if (key === 'id' || key === '_subcollections') {
        continue;
      }
      result[key] = deserializeData(data[key]);
    }
    return result;
  }

  return data;
}

// ลบ collection ทั้งหมด (สำหรับ clean mode)
async function cleanCollection(
  collectionName: string,
  batchSize: number = 500,
  dryRun: boolean = false
): Promise<number> {
  console.log(`\n🗑️  Cleaning collection: ${collectionName}`);
  
  if (dryRun) {
    console.log('  🔍 DRY RUN - Would delete all documents in this collection');
    return 0;
  }

  const collectionRef = adminDb.collection(collectionName);
  let deletedCount = 0;

  // ลบทีละ batch
  while (true) {
    const snapshot = await collectionRef.limit(batchSize).get();
    
    if (snapshot.empty) {
      break;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    deletedCount += snapshot.size;
    
    console.log(`  Deleted ${deletedCount} documents...`);
  }

  console.log(`  ✅ Cleaned ${collectionName}: ${deletedCount} documents deleted`);
  return deletedCount;
}

// Restore subcollections
async function restoreSubcollections(
  parentDocRef: FirebaseFirestore.DocumentReference,
  subcollections: any,
  dryRun: boolean = false
): Promise<void> {
  for (const [subCollectionName, subDocs] of Object.entries(subcollections)) {
    console.log(`    └─ Restoring subcollection: ${subCollectionName} (${(subDocs as any[]).length} docs)`);
    
    if (!dryRun) {
      for (const subDoc of subDocs as any[]) {
        const subDocRef = parentDocRef.collection(subCollectionName).doc(subDoc.id);
        const data = deserializeData(subDoc);
        await subDocRef.set(data);
      }
    }
  }
}

// Restore single collection
async function restoreCollection(
  collectionName: string,
  documents: any[],
  options: { dryRun: boolean; overwrite: boolean; batchSize: number }
): Promise<{ success: number; failed: number; skipped: number }> {
  const { dryRun, overwrite, batchSize } = options;
  
  console.log(`\n📦 Restoring collection: ${collectionName}`);
  console.log(`  Documents to restore: ${documents.length}`);
  
  if (dryRun) {
    console.log('  🔍 DRY RUN - No actual changes will be made');
  }

  let success = 0;
  let failed = 0;
  let skipped = 0;

  // แบ่ง batch
  const batches: any[][] = [];
  for (let i = 0; i < documents.length; i += batchSize) {
    batches.push(documents.slice(i, i + batchSize));
  }

  console.log(`  Processing in ${batches.length} batches...`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`  Batch ${batchIndex + 1}/${batches.length}...`);

    for (const doc of batch) {
      try {
        const docRef = adminDb.collection(collectionName).doc(doc.id);

        // ตรวจสอบว่ามีอยู่แล้วหรือไม่ (เฉพาะถ้าไม่ใช่ overwrite)
        if (!overwrite) {
          const existing = await docRef.get();
          if (existing.exists) {
            skipped++;
            continue;
          }
        }

        // Restore document
        if (!dryRun) {
          const data = deserializeData(doc);
          await docRef.set(data);

          // Restore subcollections
          if (doc._subcollections) {
            await restoreSubcollections(docRef, doc._subcollections, dryRun);
          }
        }

        success++;
      } catch (error) {
        console.error(`    ❌ Failed to restore document ${doc.id}:`, error);
        failed++;
      }
    }
  }

  console.log(`  ✅ Completed: ${collectionName}`);
  console.log(`     Success: ${success}, Failed: ${failed}, Skipped: ${skipped}`);

  return { success, failed, skipped };
}

// Main restore function
export async function restoreFirestore(options: RestoreOptions) {
  const {
    backupDir,
    collections,
    dryRun = false,
    overwrite = false,
    clean = false,
    batchSize = 500
  } = options;

  console.log('🚀 Starting Firestore Restore...\n');
  console.log(`📁 Backup directory: ${backupDir}`);
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  } else if (clean) {
    console.log('⚠️  CLEAN MODE - All existing data will be DELETED before restore');
  } else if (overwrite) {
    console.log('⚠️  OVERWRITE MODE - Existing documents will be replaced');
  } else {
    console.log('🛡️  SAFE MODE - Existing documents will be skipped');
  }
  console.log('');

  // ตรวจสอบ backup directory
  if (!fs.existsSync(backupDir)) {
    throw new Error(`Backup directory not found: ${backupDir}`);
  }

  // อ่าน metadata
  const metadataPath = path.join(backupDir, '_metadata.json');
  let metadata: any = null;
  
  if (fs.existsSync(metadataPath)) {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    console.log(`📋 Backup created: ${metadata.timestamp}\n`);
  }

  // หา collections ที่จะ restore
  const availableCollections = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.json') && file !== '_metadata.json')
    .map(file => file.replace('.json', ''));

  const collectionsToRestore = collections || availableCollections;
  
  console.log(`📋 Collections to restore: ${collectionsToRestore.join(', ')}\n`);

  const results: any = {
    timestamp: new Date().toISOString(),
    dryRun,
    overwrite,
    clean,
    collections: {},
    cleaned: {}
  };

  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalDeleted = 0;

  // Clean collections ก่อน (ถ้าเปิด clean mode)
  if (clean) {
    console.log('=' .repeat(50));
    console.log('🗑️  CLEANING PHASE - Deleting existing data');
    console.log('='.repeat(50));
    
    for (const collectionName of collectionsToRestore) {
      try {
        const deletedCount = await cleanCollection(collectionName, batchSize, dryRun);
        results.cleaned[collectionName] = deletedCount;
        totalDeleted += deletedCount;
      } catch (error) {
        console.error(`❌ Error cleaning ${collectionName}:`, error);
        results.cleaned[collectionName] = {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    console.log('\n✅ Cleaning phase completed!\n');
  }

  // Restore phase
  console.log('='.repeat(50));
  console.log('📦 RESTORE PHASE - Restoring data from backup');
  console.log('='.repeat(50));

  // Restore แต่ละ collection
  for (const collectionName of collectionsToRestore) {
    try {
      const filePath = path.join(backupDir, `${collectionName}.json`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${collectionName}.json - Skipping`);
        continue;
      }

      const documents = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      const result = await restoreCollection(collectionName, documents, {
        dryRun,
        overwrite: clean ? true : overwrite, // ถ้า clean = true ให้ overwrite เสมอ
        batchSize
      });

      results.collections[collectionName] = result;
      totalSuccess += result.success;
      totalFailed += result.failed;
      totalSkipped += result.skipped;

    } catch (error) {
      console.error(`❌ Error restoring ${collectionName}:`, error);
      results.collections[collectionName] = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Restore Summary:');
  console.log('='.repeat(50));
  
  if (clean && totalDeleted > 0) {
    console.log(`🗑️  Deleted (cleaning): ${totalDeleted} documents`);
  }
  console.log(`✅ Successfully restored: ${totalSuccess} documents`);
  console.log(`❌ Failed: ${totalFailed} documents`);
  if (!clean && totalSkipped > 0) {
    console.log(`⏭️  Skipped (already exists): ${totalSkipped} documents`);
  }
  console.log('='.repeat(50));

  if (dryRun) {
    console.log('\n🔍 This was a DRY RUN - No actual changes were made');
    console.log('   Run without --dry-run to actually restore the data\n');
  } else {
    console.log('\n✅ Restore completed!\n');
  }

  return results;
}

// หา backup directory (รองรับทั้ง path เต็มและแค่ชื่อ)
function resolveBackupDir(input: string): string {
  // ถ้าเป็น path เต็มอยู่แล้ว
  if (fs.existsSync(input)) {
    return input;
  }

  // ถ้าเป็นแค่ชื่อ ลองหาใน ./backup/data/
  const defaultBackupPath = path.join(process.cwd(), 'backup', 'data', input);
  if (fs.existsSync(defaultBackupPath)) {
    return defaultBackupPath;
  }

  // ถ้ายังไม่เจอ throw error
  throw new Error(`Backup not found: ${input}\nTried:\n  - ${input}\n  - ${defaultBackupPath}`);
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage: npm run restore <backup-name> [options]

Arguments:
  <backup-name>            Backup directory name or full path
                          Examples: 
                            - backup-2024-01-15-10-30-00
                            - ./backup/data/backup-2024-01-15-10-30-00

Options:
  --collections <list>     Comma-separated list of collections to restore
  --dry-run               Preview changes without actually restoring
  --overwrite             Overwrite existing documents (default: skip)
  --clean                 DELETE all existing data before restore (full restore)
  --batch-size <number>   Number of documents per batch (default: 500)

Modes:
  Safe Mode (default)     Skip existing documents, keep new data
  Overwrite Mode          Replace existing documents, keep new data
  Clean Mode              DELETE ALL data first, then restore (true restore)

Examples:
  npm run restore backup-2024-01-15-10-30-00
  npm run restore backup-2024-01-15-10-30-00 --dry-run
  npm run restore backup-2024-01-15-10-30-00 --overwrite
  npm run restore backup-2024-01-15-10-30-00 --clean
  npm run restore backup-2024-01-15-10-30-00 --clean --collections branches,subjects
    `);
    process.exit(0);
  }

  const backupInput = args[0];
  let backupDir: string;
  
  try {
    backupDir = resolveBackupDir(backupInput);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }

  const options: RestoreOptions = { backupDir };

  // Parse arguments
  if (args.includes('--collections')) {
    const idx = args.indexOf('--collections');
    options.collections = args[idx + 1]?.split(',');
  }

  if (args.includes('--dry-run')) {
    options.dryRun = true;
  }

  if (args.includes('--overwrite')) {
    options.overwrite = true;
  }

  if (args.includes('--clean')) {
    options.clean = true;
  }

  if (args.includes('--batch-size')) {
    const idx = args.indexOf('--batch-size');
    options.batchSize = parseInt(args[idx + 1]) || 500;
  }

  // Confirmation prompt (ถ้าไม่ใช่ dry-run)
  if (!options.dryRun) {
    console.log('\n⚠️  WARNING: This will restore data to Firestore!');
    console.log(`    Backup: ${path.basename(backupDir)}`);
    
    if (options.clean) {
      console.log(`    🔴 CLEAN MODE: ALL EXISTING DATA WILL BE DELETED FIRST!`);
    } else if (options.overwrite) {
      console.log(`    Overwrite mode: YES (replace existing documents)`);
    } else {
      console.log(`    Safe mode: YES (skip existing documents)`);
    }
    
    console.log('\nPress Ctrl+C to cancel or wait 5 seconds to continue...\n');

    setTimeout(() => {
      restoreFirestore(options)
        .then(() => {
          console.log('🎉 Restore process finished!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('\n❌ Restore failed:', error);
          process.exit(1);
        });
    }, 5000);
  } else {
    restoreFirestore(options)
      .then(() => {
        console.log('🎉 Dry run finished!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Dry run failed:', error);
        process.exit(1);
      });
  }
}