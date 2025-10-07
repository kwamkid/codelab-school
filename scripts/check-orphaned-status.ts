// scripts/check-orphaned-status.ts
// เช็คสถานะของ orphaned makeups ที่หา class ไม่เจอ

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  const serviceAccount = require('../serviceAccountKey.json');
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

const orphanedIds = [
  '5tU6fAITbXJiMkSHVsMU',
  'A8iXT4tF66yuIzrFgaci',
  'CsxBBQMQnfn3FiPZ9xe2',
  'LhrQaKp7Zrt2uQ4rLkLn',
  'M57DYhckIn1pbt9zjTwL',
  'TXNkmJNbfjrGvfUUNQMd',
  'UTwTIjqspI5pIGDoPwUr',
  'f9s8CKU6g1dGRs2o3ayk',
  'jUQbBOu6vT7kINouTb3H',
  'nHpBzLqLpkDKz20bj4kN',
  'w0qHsYgBU1xOf9KZRI9A'
];

async function checkOrphanedStatus() {
  console.log('🔍 เช็คสถานะ Orphaned Makeups (11 รายการ)\n');
  console.log('═'.repeat(80));

  const results: any[] = [];

  for (const makeupId of orphanedIds) {
    try {
      const makeupDoc = await db.collection('makeupClasses').doc(makeupId).get();
      
      if (!makeupDoc.exists) {
        results.push({
          id: makeupId,
          status: '❌ ไม่พบข้อมูล',
          canDelete: true
        });
        continue;
      }

      const data = makeupDoc.data()!;
      
      const statusEmoji = {
        'pending': '⏳',
        'scheduled': '📅',
        'completed': '✅',
        'cancelled': '❌'
      }[data.status] || '❓';

      const canDelete = ['completed', 'cancelled'].includes(data.status);
      
      results.push({
        id: makeupId,
        status: data.status,
        emoji: statusEmoji,
        studentId: data.studentId,
        originalClassId: data.originalClassId,
        requestDate: data.requestDate?.toDate(),
        createdAt: data.createdAt?.toDate(),
        canDelete,
        reason: data.reason || '-'
      });

    } catch (error: any) {
      results.push({
        id: makeupId,
        status: '⚠️ Error',
        error: error.message,
        canDelete: false
      });
    }
  }

  // แสดงผล
  console.log('\n📊 สรุปผล:\n');
  
  const byStatus: { [key: string]: number } = {};
  results.forEach(r => {
    const status = r.status;
    byStatus[status] = (byStatus[status] || 0) + 1;
  });

  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`   ${status}: ${count} รายการ`);
  });

  console.log('\n' + '═'.repeat(80));
  console.log('📋 รายละเอียด:\n');

  results.forEach((r, index) => {
    console.log(`${index + 1}. [${r.id}]`);
    console.log(`   สถานะ: ${r.emoji || ''} ${r.status}`);
    if (r.reason) console.log(`   เหตุผล: ${r.reason}`);
    if (r.requestDate) console.log(`   วันที่ขอ: ${r.requestDate.toLocaleDateString('th-TH')}`);
    if (r.createdAt) console.log(`   สร้างเมื่อ: ${r.createdAt.toLocaleDateString('th-TH')}`);
    console.log(`   ลบได้: ${r.canDelete ? '✅ ใช่' : '❌ ไม่แนะนำ'}`);
    console.log();
  });

  console.log('═'.repeat(80));
  console.log('\n💡 คำแนะนำ:\n');
  
  const canDeleteCount = results.filter(r => r.canDelete).length;
  const cannotDeleteCount = results.filter(r => !r.canDelete && r.status !== '❌ ไม่พบข้อมูล').length;

  console.log(`✅ ลบได้: ${canDeleteCount} รายการ (status: completed/cancelled)`);
  console.log(`⚠️  ไม่แนะนำลบ: ${cannotDeleteCount} รายการ (status: pending/scheduled)`);
  console.log();
  
  if (canDeleteCount > 0) {
    console.log('👉 สามารถลบรายการที่ completed/cancelled ได้โดยใช้:');
    console.log('   npx tsx scripts/delete-orphaned-makeups.ts --only-completed\n');
  }
  
  if (cannotDeleteCount > 0) {
    console.log('⚠️  Makeup ที่ pending/scheduled ควรตรวจสอบก่อน:');
    console.log('   - อาจต้องยกเลิกด้วยตนเอง');
    console.log('   - หรือตรวจสอบว่าทำไมถึงหา class ไม่เจอ\n');
  }

  return results;
}

// Run
checkOrphanedStatus()
  .then(() => {
    console.log('✅ เสร็จสิ้น\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  });