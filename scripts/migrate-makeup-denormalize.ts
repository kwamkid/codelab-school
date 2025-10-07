// scripts/migrate-makeup-denormalize.ts
// Migration script to add denormalized data to existing makeup classes

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as readline from 'readline';

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = require('../serviceAccountKey.json');
  
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

interface MigrationStats {
  total: number;
  success: number;
  skipped: number;
  failed: number;
  errors: { id: string; error: string }[];
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function migrateMakeupClasses(dryRun: boolean = true): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  try {
    console.log('\n🔍 กำลังค้นหา Makeup Classes...\n');
    
    // Get all makeup classes
    const makeupSnapshot = await db.collection('makeupClasses').get();
    stats.total = makeupSnapshot.size;
    
    console.log(`พบ Makeup Class ทั้งหมด: ${stats.total} รายการ\n`);
    
    if (stats.total === 0) {
      console.log('✅ ไม่มี Makeup Class ที่ต้อง migrate');
      return stats;
    }

    // Process each makeup class
    for (const makeupDoc of makeupSnapshot.docs) {
      const makeupId = makeupDoc.id;
      const makeupData = makeupDoc.data();
      
      try {
        // Check if already has denormalized data
        if (makeupData.studentName && makeupData.parentName && makeupData.branchId) {
          console.log(`⏭️  [${makeupId}] ข้ามแล้ว - มีข้อมูลครบแล้ว`);
          stats.skipped++;
          continue;
        }

        console.log(`\n📝 กำลังประมวลผล [${makeupId}]...`);

        // Fetch required data
        console.log('   - โหลดข้อมูลนักเรียน...');
        const studentDoc = await db.collection('parents')
          .doc(makeupData.parentId)
          .collection('students')
          .doc(makeupData.studentId)
          .get();
        
        if (!studentDoc.exists) {
          throw new Error('ไม่พบข้อมูลนักเรียน');
        }
        const studentData = studentDoc.data()!;

        console.log('   - โหลดข้อมูลผู้ปกครอง...');
        const parentDoc = await db.collection('parents')
          .doc(makeupData.parentId)
          .get();
        
        if (!parentDoc.exists) {
          throw new Error('ไม่พบข้อมูลผู้ปกครอง');
        }
        const parentData = parentDoc.data()!;

        console.log('   - โหลดข้อมูลคลาส...');
        const classDoc = await db.collection('classes')
          .doc(makeupData.originalClassId)
          .get();
        
        if (!classDoc.exists) {
          throw new Error('ไม่พบข้อมูลคลาส');
        }
        const classData = classDoc.data()!;

        console.log('   - โหลดข้อมูลวิชา...');
        const subjectDoc = await db.collection('subjects')
          .doc(classData.subjectId)
          .get();
        const subjectData = subjectDoc.exists ? subjectDoc.data()! : null;

        console.log('   - โหลดข้อมูลสาขา...');
        const branchDoc = await db.collection('branches')
          .doc(classData.branchId)
          .get();
        const branchData = branchDoc.exists ? branchDoc.data()! : null;

        // Load schedule data if available
        let scheduleData = null;
        if (makeupData.originalScheduleId) {
          console.log('   - โหลดข้อมูลตารางเรียน...');
          const scheduleDoc = await db.collection('classes')
            .doc(makeupData.originalClassId)
            .collection('schedules')
            .doc(makeupData.originalScheduleId)
            .get();
          
          if (scheduleDoc.exists) {
            scheduleData = scheduleDoc.data()!;
          }
        }

        // Prepare update data
        const updateData: any = {
          // Student data
          studentName: studentData.name,
          studentNickname: studentData.nickname,
          
          // Parent data
          parentName: parentData.displayName,
          parentPhone: parentData.phone,
          parentLineUserId: parentData.lineUserId || null,
          
          // Class data
          className: classData.name,
          classCode: classData.code,
          subjectId: classData.subjectId,
          subjectName: subjectData?.name || '',
          
          // Branch data
          branchId: classData.branchId,
          branchName: branchData?.name || '',
          
          // Original session data
          originalSessionNumber: scheduleData?.sessionNumber || null,
          originalSessionDate: scheduleData?.sessionDate || null,
        };

        // Update makeupSchedule if exists
        if (makeupData.makeupSchedule) {
          console.log('   - โหลดข้อมูลครูและห้อง...');
          
          // Load teacher
          const teacherDoc = await db.collection('teachers')
            .doc(makeupData.makeupSchedule.teacherId)
            .get();
          const teacherData = teacherDoc.exists ? teacherDoc.data()! : null;
          
          // Load room
          const roomDoc = await db.collection('branches')
            .doc(makeupData.makeupSchedule.branchId)
            .collection('rooms')
            .doc(makeupData.makeupSchedule.roomId)
            .get();
          const roomData = roomDoc.exists ? roomDoc.data()! : null;
          
          updateData.makeupSchedule = {
            ...makeupData.makeupSchedule,
            teacherName: teacherData?.nickname || teacherData?.name || null,
            roomName: roomData?.name || null
          };
        }

        // Display update preview
        console.log('\n   ✨ ข้อมูลที่จะเพิ่ม:');
        console.log(`      - นักเรียน: ${updateData.studentName} (${updateData.studentNickname})`);
        console.log(`      - ผู้ปกครอง: ${updateData.parentName} (${updateData.parentPhone})`);
        console.log(`      - คลาส: ${updateData.className} (${updateData.classCode})`);
        console.log(`      - วิชา: ${updateData.subjectName}`);
        console.log(`      - สาขา: ${updateData.branchName}`);
        if (updateData.originalSessionNumber) {
          console.log(`      - ครั้งที่: ${updateData.originalSessionNumber}`);
        }
        if (updateData.makeupSchedule?.teacherName) {
          console.log(`      - ครู Makeup: ${updateData.makeupSchedule.teacherName}`);
        }
        if (updateData.makeupSchedule?.roomName) {
          console.log(`      - ห้อง Makeup: ${updateData.makeupSchedule.roomName}`);
        }

        // Update or dry run
        if (!dryRun) {
          console.log('   💾 กำลังบันทึก...');
          await makeupDoc.ref.update(updateData);
          console.log('   ✅ บันทึกสำเร็จ!');
          stats.success++;
        } else {
          console.log('   🔍 [DRY RUN] ไม่ได้บันทึกจริง');
          stats.success++;
        }

      } catch (error: any) {
        console.error(`   ❌ เกิดข้อผิดพลาด: ${error.message}`);
        stats.failed++;
        stats.errors.push({
          id: makeupId,
          error: error.message
        });
      }
    }

    return stats;

  } catch (error) {
    console.error('เกิดข้อผิดพลาดร้ายแรง:', error);
    throw error;
  }
}

async function createFirestoreIndex() {
  console.log('\n📊 Firestore Index ที่ควรสร้าง:\n');
  console.log('Collection: makeupClasses');
  console.log('Fields:');
  console.log('  - branchId (Ascending)');
  console.log('  - createdAt (Descending)');
  console.log('\nสร้างได้ที่: Firebase Console > Firestore > Indexes');
  console.log('หรือจะสร้างอัตโนมัติเมื่อ query ครั้งแรก\n');
}

// Main execution
async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   🚀 Makeup Classes Denormalization Migration       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  // Step 1: Dry run
  console.log('📋 ขั้นตอนที่ 1: Dry Run (ไม่บันทึกจริง)\n');
  
  const dryRunStats = await migrateMakeupClasses(true);
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 สรุปผลการ Dry Run:');
  console.log('═'.repeat(60));
  console.log(`✅ ทั้งหมด: ${dryRunStats.total} รายการ`);
  console.log(`✨ จะอัพเดท: ${dryRunStats.success} รายการ`);
  console.log(`⏭️  ข้าม: ${dryRunStats.skipped} รายการ (มีข้อมูลแล้ว)`);
  console.log(`❌ ผิดพลาด: ${dryRunStats.failed} รายการ`);
  
  if (dryRunStats.errors.length > 0) {
    console.log('\n⚠️  รายการที่มีปัญหา:');
    dryRunStats.errors.forEach(err => {
      console.log(`   - ${err.id}: ${err.error}`);
    });
  }
  
  console.log('═'.repeat(60) + '\n');

  // Step 2: Confirm before actual migration
  if (dryRunStats.success > 0) {
    const answer = await prompt('ต้องการทำการ migrate จริงหรือไม่? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ ยกเลิกการ migrate');
      process.exit(0);
    }

    console.log('\n📋 ขั้นตอนที่ 2: Migrate จริง\n');
    
    const realStats = await migrateMakeupClasses(false);
    
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 สรุปผลการ Migrate:');
    console.log('═'.repeat(60));
    console.log(`✅ ทั้งหมด: ${realStats.total} รายการ`);
    console.log(`✨ สำเร็จ: ${realStats.success} รายการ`);
    console.log(`⏭️  ข้าม: ${realStats.skipped} รายการ`);
    console.log(`❌ ผิดพลาด: ${realStats.failed} รายการ`);
    
    if (realStats.errors.length > 0) {
      console.log('\n⚠️  รายการที่มีปัญหา:');
      realStats.errors.forEach(err => {
        console.log(`   - ${err.id}: ${err.error}`);
      });
    }
    
    console.log('═'.repeat(60) + '\n');
  }

  // Step 3: Show index recommendation
  await createFirestoreIndex();

  console.log('✅ เสร็จสิ้น!\n');
  process.exit(0);
}

// Run
main().catch(error => {
  console.error('เกิดข้อผิดพลาด:', error);
  process.exit(1);
});