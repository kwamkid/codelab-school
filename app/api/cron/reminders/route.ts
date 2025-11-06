// app/api/cron/reminders/route.ts

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
import { getEventsForReminder, sendEventReminder } from '@/lib/services/events';

export const dynamic = 'force-dynamic';

// ✅ ฟังก์ชันตรวจสอบ secret key (รองรับทั้ง header และ query parameter)
function verifySecret(request: NextRequest): boolean {
  // ดึง secret จาก query parameter
  const querySecret = request.nextUrl.searchParams.get('secret');
  
  // ดึง secret จาก environment variable
  const cronSecret = process.env.CRON_SECRET;
  
  // ตรวจสอบว่ามี CRON_SECRET หรือไม่
  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET not configured in environment variables!');
    return false;
  }
  
  // ตรวจสอบว่ามี query parameter หรือไม่
  if (!querySecret) {
    console.error('[Cron] No secret parameter provided');
    return false;
  }
  
  // เปรียบเทียบ secret
  const isValid = querySecret === cronSecret;
  
  if (!isValid) {
    console.error('[Cron] Invalid secret provided');
  } else {
    console.log('[Cron] ✓ Authorization successful');
  }
  
  return isValid;
}

export async function GET(request: NextRequest) {
  console.log('\n=== Starting combined reminder cron job ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Thailand Time:', new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }));
  
  // ✅ Verify request
  if (!verifySecret(request)) {
    console.error('[Cron] ❌ Unauthorized request blocked');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    
    let totalSent = 0;
    const results = {
      classReminders: 0,
      makeupReminders: 0,
      eventReminders: 0,
      errors: [] as string[]
    };
    
    console.log('Current time:', now.toLocaleString('th-TH'));
    console.log('Checking for tomorrow:', tomorrow.toLocaleDateString('th-TH'));
    
    // ============================================
    // 1. Class Reminders (from send-reminders)
    // ============================================
    console.log('\n--- Part 1: Class Reminders ---');
    
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
        console.log(`\nClass "${classData?.name || classId}": Found ${schedulesSnapshot.size} sessions tomorrow`);
        
        // ดึง enrollments ที่ active
        const enrollmentsQuery = query(
          collection(db, 'enrollments'),
          where('classId', '==', classDoc.id),
          where('status', '==', 'active')
        );
        
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        console.log(`  - ${enrollmentsSnapshot.size} active students`);
        
        // Process each schedule
        for (const scheduleDoc of schedulesSnapshot.docs) {
          const schedule = scheduleDoc.data();
          const scheduleId = scheduleDoc.id;
          
          console.log(`\n  Processing schedule ${scheduleId} (Session #${schedule.sessionNumber})`);
          
          // ส่ง reminder ให้นักเรียนแต่ละคน
          for (const enrollmentDoc of enrollmentsSnapshot.docs) {
            const enrollment = enrollmentDoc.data();
            
            try {
              // ส่ง scheduleId ไปด้วย
              const success = await sendClassReminder(
                enrollment.studentId,
                classDoc.id,
                schedule.sessionDate.toDate(),
                scheduleId // ส่ง scheduleId ไปด้วย
              );
              
              if (success) {
                results.classReminders++;
                totalSent++;
                console.log(`    ✓ Sent reminder for student ${enrollment.studentId}`);
              } else {
                console.log(`    ✗ Failed to send for student ${enrollment.studentId}`);
              }
            } catch (error) {
              console.error(`    ! Error for student ${enrollment.studentId}:`, error);
              results.errors.push(`Class reminder error: ${error}`);
            }
          }
        }
      }
    }
    
    // ============================================
    // 2. Makeup Class Reminders
    // ============================================
    console.log('\n--- Part 2: Makeup Class Reminders ---');
    
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
        console.log(`\nProcessing makeup for student ${makeup.studentId}`);
        
        const success = await sendMakeupNotification(makeupDoc.id, 'reminder');
        if (success) {
          results.makeupReminders++;
          totalSent++;
          console.log('  ✓ Sent makeup reminder');
        } else {
          console.log('  ✗ Failed to send makeup reminder');
        }
      } catch (error) {
        console.error('  ! Makeup reminder error:', error);
        results.errors.push(`Makeup reminder error: ${error}`);
      }
    }
    
    // ============================================
    // 3. Event Reminders (from event-reminders)
    // ============================================
    console.log('\n--- Part 3: Event Reminders ---');
    
    // Get events that need reminders
    const eventsToRemind = await getEventsForReminder();
    console.log(`Found ${eventsToRemind.length} events with reminders to send`);
    
    // Process each event
    for (const { event, registrations } of eventsToRemind) {
      console.log(`\nProcessing event: ${event.name}`);
      console.log(`Found ${registrations.length} registrations to remind`);
      
      // Send reminder to each registration
      for (const registration of registrations) {
        try {
          const success = await sendEventReminder(registration, event);
          
          if (success) {
            results.eventReminders++;
            totalSent++;
            console.log(`  ✓ Sent reminder for registration ${registration.id}`);
          } else {
            console.log(`  ✗ Failed to send reminder for registration ${registration.id}`);
          }
        } catch (error) {
          console.error(`  ! Error sending reminder for registration ${registration.id}:`, error);
          results.errors.push(`Event reminder error: ${error}`);
        }
      }
    }
    
    // ============================================
    // Summary
    // ============================================
    console.log('\n=== Combined reminder cron job completed ===');
    console.log('Summary:', {
      totalSent,
      classReminders: results.classReminders,
      makeupReminders: results.makeupReminders,
      eventReminders: results.eventReminders,
      errors: results.errors.length
    });
    
    return NextResponse.json({
      success: true,
      message: `ส่งการแจ้งเตือนทั้งหมด ${totalSent} รายการ`,
      sentCount: totalSent,
      details: results,
      timestamp: now.toISOString()
    });
    
  } catch (error) {
    console.error('!!! Combined reminder cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}