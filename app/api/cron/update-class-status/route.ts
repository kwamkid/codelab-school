// app/api/cron/update-class-status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

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
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    console.log('=== Starting class status update cron job ===');
    console.log('Current time:', now.toLocaleString('th-TH'));
    
    const results = {
      classesChecked: 0,
      classesCompleted: 0,
      classesStarted: 0,
      errors: [] as string[]
    };
    
    // 1. Update classes that should be marked as 'completed'
    console.log('\n--- Checking for completed classes ---');
    
    const activeClassesQuery = query(
      collection(db, 'classes'),
      where('status', 'in', ['started', 'published'])
    );
    
    const activeClassesSnapshot = await getDocs(activeClassesQuery);
    console.log(`Found ${activeClassesSnapshot.size} active/published classes`);
    
    for (const classDoc of activeClassesSnapshot.docs) {
      try {
        results.classesChecked++;
        
        const classData = classDoc.data();
        const classId = classDoc.id;
        
        // Check if endDate has passed
        const endDate = classData.endDate?.toDate();
        if (!endDate) {
          console.log(`Class ${classId} has no endDate`);
          continue;
        }
        
        // Compare dates (ignore time)
        const endDateOnly = new Date(endDate);
        endDateOnly.setHours(23, 59, 59, 999); // End of day
        
        if (endDateOnly < now) {
          // Class has ended - check if all sessions are completed
          console.log(`Class "${classData.name}" (${classId}) end date has passed`);
          
          // Get all schedules for this class
          const schedulesQuery = query(
            collection(db, 'classes', classId, 'schedules'),
            where('status', '!=', 'cancelled')
          );
          
          const schedulesSnapshot = await getDocs(schedulesQuery);
          let allSessionsCompleted = true;
          let lastSessionDate: Date | null = null;
          
          // Check if all sessions are in the past
          schedulesSnapshot.forEach(scheduleDoc => {
            const schedule = scheduleDoc.data();
            const sessionDate = schedule.sessionDate?.toDate();
            
            if (sessionDate && sessionDate > now) {
              allSessionsCompleted = false;
            }
            
            // Track the last session date
            if (sessionDate && (!lastSessionDate || sessionDate > lastSessionDate)) {
              lastSessionDate = sessionDate;
            }
          });
          
          // If all sessions are completed or last session has passed
          if (allSessionsCompleted || (lastSessionDate && lastSessionDate < now)) {
            console.log(`  ✓ Marking class as completed`);
            
            await updateDoc(doc(db, 'classes', classId), {
              status: 'completed',
              completedAt: Timestamp.now(),
              completedBy: 'system-cron'
            });
            
            results.classesCompleted++;
          } else {
            console.log(`  - Class still has future sessions`);
          }
        }
        
        // 2. Update classes that should be marked as 'started'
        if (classData.status === 'published') {
          const startDate = classData.startDate?.toDate();
          if (startDate && startDate <= now) {
            console.log(`Class "${classData.name}" (${classId}) should be started`);
            
            await updateDoc(doc(db, 'classes', classId), {
              status: 'started',
              startedAt: Timestamp.now(),
              startedBy: 'system-cron'
            });
            
            results.classesStarted++;
          }
        }
        
      } catch (error) {
        console.error(`Error processing class ${classDoc.id}:`, error);
        results.errors.push(`Class ${classDoc.id}: ${error}`);
      }
    }
    
    console.log('\n=== Class status update completed ===');
    console.log('Summary:', {
      classesChecked: results.classesChecked,
      classesCompleted: results.classesCompleted,
      classesStarted: results.classesStarted,
      errors: results.errors.length
    });
    
    return NextResponse.json({
      success: true,
      message: `Updated ${results.classesCompleted} completed classes, ${results.classesStarted} started classes`,
      details: results,
      timestamp: now.toISOString()
    });
    
  } catch (error) {
    console.error('!!! Class status update cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}