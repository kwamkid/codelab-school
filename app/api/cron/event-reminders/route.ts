// app/api/cron/event-reminders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getEventsForReminder, sendEventReminder } from '@/lib/services/events';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify request is from Vercel Cron
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const now = new Date();
    console.log('=== Starting event reminder cron job ===');
    console.log('Current time:', now.toLocaleString('th-TH'));
    
    // Get events that need reminders
    const eventsToRemind = await getEventsForReminder();
    console.log(`Found ${eventsToRemind.length} events with reminders to send`);
    
    let totalSent = 0;
    const results = {
      eventsProcessed: 0,
      remindersAttempted: 0,
      remindersSent: 0,
      errors: [] as string[]
    };
    
    // Process each event
    for (const { event, registrations } of eventsToRemind) {
      console.log(`\n--- Processing event: ${event.name} ---`);
      console.log(`Found ${registrations.length} registrations to remind`);
      
      results.eventsProcessed++;
      
      // Send reminder to each registration
      for (const registration of registrations) {
        results.remindersAttempted++;
        
        try {
          const success = await sendEventReminder(registration, event);
          
          if (success) {
            results.remindersSent++;
            totalSent++;
            console.log(`✓ Sent reminder for registration ${registration.id}`);
          } else {
            console.log(`✗ Failed to send reminder for registration ${registration.id}`);
          }
        } catch (error) {
          console.error(`! Error sending reminder for registration ${registration.id}:`, error);
          results.errors.push(`Registration ${registration.id}: ${error}`);
        }
      }
    }
    
    console.log('\n=== Event reminder cron job completed ===');
    console.log('Summary:', {
      totalSent,
      eventsProcessed: results.eventsProcessed,
      remindersAttempted: results.remindersAttempted,
      remindersSent: results.remindersSent,
      errors: results.errors.length
    });
    
    return NextResponse.json({
      success: true,
      message: `ส่งการแจ้งเตือน ${totalSent} รายการ`,
      sentCount: totalSent,
      details: results,
      timestamp: now.toISOString()
    });
    
  } catch (error) {
    console.error('!!! Event reminder cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}