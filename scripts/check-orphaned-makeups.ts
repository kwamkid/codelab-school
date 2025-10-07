// scripts/check-orphaned-makeups.ts
// ตรวจสอบ makeup classes ที่ไม่มีคลาสแล้ว

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  const serviceAccount = require('../serviceAccountKey.json');
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

async function checkOrphanedMakeups() {
  console.log('🔍 กำลังตรวจสอบ Makeup Classes ที่ไม่มีคลาส...\n');

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

  const results = [];

  for (const makeupId of orphanedIds) {
    try {
      const makeupDoc = await db.collection('makeupClasses').doc(makeupId).get();
      
      if (!makeupDoc.exists) {
        results.push({
          id: makeupId,
          status: 'not_found',
          data: null
        });
        continue;
      }

      const makeupData = makeupDoc.data()!;
      
      // ตรวจสอบว่าคลาสมีอยู่จริงไหม
      const classDoc = await db.collection('classes').doc(makeupData.originalClassId).get();
      
      results.push({
        id: makeupId,
        status: classDoc.exists ? 'class_exists' : 'class_deleted',
        makeupStatus: makeupData.status,
        studentId: makeupData.studentId,
        originalClassId: makeupData.originalClassId,
        requestDate: makeupData.requestDate?.toDate(),
        createdAt: makeupData.createdAt?.toDate(),
        data: makeupData
      });

    } catch (error: any) {
      results.push({
        id: makeupId,
        status: 'error',
        error: error.message
      });
    }
  }

  // แสดงผล
  console.log('📊 สรุปผล:\n');
  
  const classDeleted = results.filter(r => r.status === 'class_deleted');
  const notFound = results.filter(r => r.status === 'not_found');
  const errors = results.filter(r => r.status === 'error');

  console.log(`❌ คลาสถูกลบ: ${classDeleted.length} รายการ`);
  console.log(`🔍 Makeup ไม่มี: ${notFound.length} รายการ`);
  console.log(`⚠️  Error: ${errors.length} รายการ\n`);

  if (classDeleted.length > 0) {
    console.log('═'.repeat(80));
    console.log('📋 รายละเอียด Makeup ที่คลาสถูกลบ:\n');
    
    classDeleted.forEach((item, index) => {
      console.log(`${index + 1}. Makeup ID: ${item.id}`);
      console.log(`   - สถานะ: ${item.makeupStatus}`);
      console.log(`   - Original Class ID: ${item.originalClassId}`);
      console.log(`   - Student ID: ${item.studentId}`);
      console.log(`   - Request Date: ${item.requestDate?.toLocaleDateString('th-TH')}`);
      console.log(`   - Created: ${item.createdAt?.toLocaleDateString('th-TH')}`);
      console.log();
    });
  }

  console.log('═'.repeat(80));
  console.log('\n💡 แนะนำ:\n');
  console.log('1. ถ้าคลาสถูกลบแล้ว แต่ Makeup ยังใช้งานอยู่ (status: pending/scheduled)');
  console.log('   → ควรยกเลิก Makeup เหล่านี้\n');
  console.log('2. ถ้า Makeup เก่ามาก หรือ status: completed/cancelled');
  console.log('   → อาจลบทิ้งได้\n');
  console.log('3. ถ้าต้องการเก็บไว้');
  console.log('   → ใช้ script แก้ไขแบบ manual\n');

  return results;
}

// Run
checkOrphanedMakeups()
  .then(() => {
    console.log('✅ เสร็จสิ้น\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  });