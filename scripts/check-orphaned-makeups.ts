// scripts/check-orphaned-makeups.ts
// ตรวจสอบ makeup classes ที่ไม่มีคลาสแล้ว - แสดงข้อมูลแบบอ่านง่าย

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  const serviceAccount = require('../serviceAccountKey.json');
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

interface MakeupResult {
  id: string;
  status: string;
  makeupStatus?: string;
  
  // Makeup Data
  requestDate?: Date;
  createdAt?: Date;
  reason?: string;
  
  // Student Info
  studentId?: string;
  studentName?: string;
  studentNickname?: string;
  
  // Parent Info
  parentId?: string;
  parentName?: string;
  parentPhone?: string;
  
  // Class Info
  originalClassId?: string;
  className?: string;
  classCode?: string;
  classExists?: boolean;
  
  // Subject Info
  subjectId?: string;
  subjectName?: string;
  
  // Branch Info
  branchId?: string;
  branchName?: string;
  
  error?: string;
}

async function loadStudentInfo(parentId: string, studentId: string) {
  try {
    const studentDoc = await db
      .collection('parents')
      .doc(parentId)
      .collection('students')
      .doc(studentId)
      .get();
    
    if (!studentDoc.exists) return null;
    
    const data = studentDoc.data()!;
    return {
      name: data.name,
      nickname: data.nickname
    };
  } catch (error) {
    return null;
  }
}

async function loadParentInfo(parentId: string) {
  try {
    const parentDoc = await db.collection('parents').doc(parentId).get();
    if (!parentDoc.exists) return null;
    
    const data = parentDoc.data()!;
    return {
      name: data.displayName,
      phone: data.phone
    };
  } catch (error) {
    return null;
  }
}

async function loadClassInfo(classId: string) {
  try {
    const classDoc = await db.collection('classes').doc(classId).get();
    if (!classDoc.exists) return null;
    
    const data = classDoc.data()!;
    return {
      name: data.name,
      code: data.code,
      subjectId: data.subjectId,
      branchId: data.branchId
    };
  } catch (error) {
    return null;
  }
}

async function loadSubjectInfo(subjectId: string) {
  try {
    const subjectDoc = await db.collection('subjects').doc(subjectId).get();
    if (!subjectDoc.exists) return null;
    
    const data = subjectDoc.data()!;
    return {
      name: data.name
    };
  } catch (error) {
    return null;
  }
}

async function loadBranchInfo(branchId: string) {
  try {
    const branchDoc = await db.collection('branches').doc(branchId).get();
    if (!branchDoc.exists) return null;
    
    const data = branchDoc.data()!;
    return {
      name: data.name
    };
  } catch (error) {
    return null;
  }
}

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

  const results: MakeupResult[] = [];

  for (const makeupId of orphanedIds) {
    try {
      console.log(`📄 กำลังตรวจสอบ Makeup ID: ${makeupId}...`);
      
      const makeupDoc = await db.collection('makeupClasses').doc(makeupId).get();
      
      if (!makeupDoc.exists) {
        results.push({
          id: makeupId,
          status: 'not_found'
        });
        continue;
      }

      const makeupData = makeupDoc.data()!;
      
      // Check if using denormalized data
      const hasDenormalizedData = !!(
        makeupData.studentName && 
        makeupData.parentName && 
        makeupData.className
      );
      
      let studentInfo = null;
      let parentInfo = null;
      let classInfo = null;
      let subjectInfo = null;
      let branchInfo = null;
      
      if (hasDenormalizedData) {
        // Use denormalized data
        console.log('   ✨ ใช้ข้อมูลที่ denormalized แล้ว');
        studentInfo = {
          name: makeupData.studentName,
          nickname: makeupData.studentNickname
        };
        parentInfo = {
          name: makeupData.parentName,
          phone: makeupData.parentPhone
        };
        classInfo = {
          name: makeupData.className,
          code: makeupData.classCode,
          exists: false // Will check later
        };
        subjectInfo = {
          name: makeupData.subjectName
        };
        branchInfo = {
          name: makeupData.branchName
        };
        
        // Still check if class exists
        const classDoc = await db.collection('classes').doc(makeupData.originalClassId).get();
        classInfo.exists = classDoc.exists;
        
      } else {
        // Load from collections
        console.log('   🔍 โหลดข้อมูลจาก collections...');
        
        // Load student
        if (makeupData.studentId && makeupData.parentId) {
          studentInfo = await loadStudentInfo(makeupData.parentId, makeupData.studentId);
        }
        
        // Load parent
        if (makeupData.parentId) {
          parentInfo = await loadParentInfo(makeupData.parentId);
        }
        
        // Load class
        if (makeupData.originalClassId) {
          classInfo = await loadClassInfo(makeupData.originalClassId);
          
          // Load subject if class exists
          if (classInfo && classInfo.subjectId) {
            subjectInfo = await loadSubjectInfo(classInfo.subjectId);
          }
          
          // Load branch if class exists
          if (classInfo && classInfo.branchId) {
            branchInfo = await loadBranchInfo(classInfo.branchId);
          }
        }
      }
      
      results.push({
        id: makeupId,
        status: classInfo && (classInfo as any).exists !== false ? 'class_exists' : 'class_deleted',
        makeupStatus: makeupData.status,
        
        requestDate: makeupData.requestDate?.toDate(),
        createdAt: makeupData.createdAt?.toDate(),
        reason: makeupData.reason,
        
        studentId: makeupData.studentId,
        studentName: studentInfo?.name || '(ไม่พบข้อมูล)',
        studentNickname: studentInfo?.nickname || '-',
        
        parentId: makeupData.parentId,
        parentName: parentInfo?.name || '(ไม่พบข้อมูล)',
        parentPhone: parentInfo?.phone || '-',
        
        originalClassId: makeupData.originalClassId,
        className: classInfo?.name || '(ไม่พบข้อมูล)',
        classCode: classInfo?.code || '-',
        classExists: (classInfo as any)?.exists !== false,
        
        subjectId: makeupData.subjectId || (classInfo as any)?.subjectId,
        subjectName: subjectInfo?.name || '(ไม่พบข้อมูล)',
        
        branchId: makeupData.branchId || (classInfo as any)?.branchId,
        branchName: branchInfo?.name || '(ไม่พบข้อมูล)',
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
  console.log('\n' + '═'.repeat(80));
  console.log('📊 สรุปผล:');
  console.log('═'.repeat(80) + '\n');
  
  const classDeleted = results.filter(r => r.status === 'class_deleted');
  const classExists = results.filter(r => r.status === 'class_exists');
  const notFound = results.filter(r => r.status === 'not_found');
  const errors = results.filter(r => r.status === 'error');

  console.log(`✅ คลาสยังมีอยู่: ${classExists.length} รายการ`);
  console.log(`❌ คลาสถูกลบแล้ว: ${classDeleted.length} รายการ`);
  console.log(`🔍 Makeup ไม่พบ: ${notFound.length} รายการ`);
  console.log(`⚠️  Error: ${errors.length} รายการ\n`);

  // แสดงรายละเอียดคลาสที่ยังมีอยู่
  if (classExists.length > 0) {
    console.log('═'.repeat(80));
    console.log('✅ Makeup ที่คลาสยังมีอยู่:');
    console.log('═'.repeat(80) + '\n');
    
    classExists.forEach((item, index) => {
      console.log(`${index + 1}. 📋 Makeup ID: ${item.id}`);
      console.log(`   📌 สถานะ Makeup: ${item.makeupStatus}`);
      console.log(`   👤 นักเรียน: ${item.studentName} (${item.studentNickname})`);
      console.log(`   👨‍👩‍👧 ผู้ปกครอง: ${item.parentName} - ${item.parentPhone}`);
      console.log(`   📚 วิชา: ${item.subjectName}`);
      console.log(`   🎓 คลาส: ${item.className} (${item.classCode})`);
      console.log(`   🏢 สาขา: ${item.branchName}`);
      console.log(`   💬 เหตุผล: ${item.reason}`);
      console.log(`   📅 Request Date: ${item.requestDate?.toLocaleDateString('th-TH')}`);
      console.log(`   📅 Created: ${item.createdAt?.toLocaleDateString('th-TH')}`);
      console.log();
    });
  }

  // แสดงรายละเอียดคลาสที่ถูกลบ
  if (classDeleted.length > 0) {
    console.log('═'.repeat(80));
    console.log('❌ Makeup ที่คลาสถูกลบแล้ว:');
    console.log('═'.repeat(80) + '\n');
    
    classDeleted.forEach((item, index) => {
      console.log(`${index + 1}. 📋 Makeup ID: ${item.id}`);
      console.log(`   📌 สถานะ Makeup: ${item.makeupStatus}`);
      console.log(`   👤 นักเรียน: ${item.studentName} (${item.studentNickname})`);
      console.log(`   👨‍👩‍👧 ผู้ปกครอง: ${item.parentName} - ${item.parentPhone}`);
      console.log(`   📚 วิชา: ${item.subjectName}`);
      console.log(`   🎓 คลาส: ${item.className} (${item.classCode}) ❌ DELETED`);
      console.log(`   🏢 สาขา: ${item.branchName}`);
      console.log(`   💬 เหตุผล: ${item.reason}`);
      console.log(`   📅 Request Date: ${item.requestDate?.toLocaleDateString('th-TH')}`);
      console.log(`   📅 Created: ${item.createdAt?.toLocaleDateString('th-TH')}`);
      console.log();
    });
  }

  // แสดง errors
  if (errors.length > 0) {
    console.log('═'.repeat(80));
    console.log('⚠️  Errors:');
    console.log('═'.repeat(80) + '\n');
    
    errors.forEach((item, index) => {
      console.log(`${index + 1}. Makeup ID: ${item.id}`);
      console.log(`   Error: ${item.error}`);
      console.log();
    });
  }

  console.log('═'.repeat(80));
  console.log('\n💡 แนะนำ:\n');
  console.log('1. Makeup ที่คลาสยังอยู่:');
  console.log('   → ตรวจสอบว่าข้อมูลถูกต้องหรือไม่\n');
  console.log('2. Makeup ที่คลาสถูกลบ + status: pending/scheduled');
  console.log('   → ควรยกเลิก Makeup เหล่านี้\n');
  console.log('3. Makeup ที่คลาสถูกลบ + status: completed/cancelled');
  console.log('   → อาจลบทิ้งได้ (เก็บไว้เป็น history ก็ได้)\n');

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