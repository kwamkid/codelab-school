// app/api/cron/send-reminders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { 
  sendClassReminder, 
  sendMakeupNotification
} from '@/lib/services/line-notifications';

export const dynamic = 'force-dynamic';

// ตรวจสอบ secret key
function verifySecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify request
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    
    let sentCount = 0;
    const results = {
      classReminders: 0,
      makeupReminders: 0,
      errors: []
    };
    
    console.log('=== Starting reminder cron job ===');
    console.log('Current time:', now.toLocaleString('th-TH'));
    console.log('Checking for tomorrow:', tomorrow.toLocaleDateString('th-TH'));
    
    // 1. ส่งการแจ้งเตือนคลาสปกติ
    console.log('\n--- Checking class reminders ---');
    
    const classesQuery = query(
      collection(db, 'classes'),
      where('status', '==', 'started')
    );
    
    const classesSnapshot = await getDocs(classesQuery);
    console.log(`Found ${classesSnapshot.size} active classes`);
    
    for (const classDoc of classesSnapshot.docs) {
        const classData = classDoc.data();
        const classId = classDoc.id;      
      // ดึง schedules สำหรับพรุ่งนี้
      const schedulesQuery = query(
        collection(db, 'classes', classDoc.id, 'schedules'),
        where('sessionDate', '>=', Timestamp.fromDate(tomorrow)),
        where('sessionDate', '<', Timestamp.fromDate(dayAfterTomorrow)),
        where('status', '==', 'scheduled')
      );
      
      const schedulesSnapshot = await getDocs(schedulesQuery);
      
      if (schedulesSnapshot.size > 0) {
        console.log(`Class "${classData?.name || classId}": Found ${schedulesSnapshot.size} sessions tomorrow`);
        
        // ดึง enrollments ที่ active
        const enrollmentsQuery = query(
          collection(db, 'enrollments'),
          where('classId', '==', classDoc.id),
          where('status', '==', 'active')
        );
        
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        console.log(`  - ${enrollmentsSnapshot.size} active students`);
        
        for (const enrollmentDoc of enrollmentsSnapshot.docs) {
          const enrollment = enrollmentDoc.data();
          
          try {
            const success = await sendClassReminder(
              enrollment.studentId,
              classDoc.id,
              tomorrow
            );
            
            if (success) {
              results.classReminders++;
              sentCount++;
              console.log(`  ✓ Sent reminder for student ${enrollment.studentId}`);
            } else {
              console.log(`  ✗ Failed to send for student ${enrollment.studentId}`);
            }
          } catch (error) {
            console.error(`  ! Error for student ${enrollment.studentId}:`, error);
            results.errors.push(`Class reminder error: ${error}`);
          }
        }
      }
    }
    
    // 2. ส่งการแจ้งเตือน Makeup Class
    console.log('\n--- Checking makeup reminders ---');
    
    const makeupQuery = query(
      collection(db, 'makeupClasses'),
      where('status', '==', 'scheduled'),
      where('makeupSchedule.date', '>=', Timestamp.fromDate(tomorrow)),
      where('makeupSchedule.date', '<', Timestamp.fromDate(dayAfterTomorrow))
    );
    
    const makeupSnapshot = await getDocs(makeupQuery);
    console.log(`Found ${makeupSnapshot.size} makeup classes for tomorrow`);
    
    for (const makeupDoc of makeupSnapshot.docs) {
      try {
        const makeup = makeupDoc.data();
        console.log(`Processing makeup for student ${makeup.studentId}`);
        
        const success = await sendMakeupNotification(makeupDoc.id, 'reminder');
        if (success) {
          results.makeupReminders++;
          sentCount++;
          console.log('  ✓ Sent makeup reminder');
        } else {
          console.log('  ✗ Failed to send makeup reminder');
        }
      } catch (error) {
        console.error('  ! Makeup reminder error:', error);
        results.errors.push(`Makeup reminder error: ${error}`);
      }
    }
    
    console.log('\n=== Cron job completed ===');
    console.log('Summary:', {
      totalSent: sentCount,
      classReminders: results.classReminders,
      makeupReminders: results.makeupReminders,
      errors: results.errors.length
    });
    
    return NextResponse.json({
      success: true,
      message: `ส่งการแจ้งเตือน ${sentCount} รายการ`,
      sentCount,
      details: results,
      timestamp: now.toISOString()
    });
    
  } catch (error) {
    console.error('!!! Cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}