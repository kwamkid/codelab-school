import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    console.log('[API] Event registration request:', {
      eventId: data.eventId,
      scheduleId: data.scheduleId,
      branchId: data.branchId,
      isGuest: data.isGuest,
      attendeeCount: data.attendeeCount
    });
    
    // Validate required fields
    if (!data.eventId || !data.scheduleId || !data.branchId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get schedule to check capacity
    const scheduleDoc = await adminDb
      .collection('eventSchedules')
      .doc(data.scheduleId)
      .get();
      
    if (!scheduleDoc.exists) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    
    const schedule = scheduleDoc.data()!;
    const currentAttendees = Object.values(schedule.attendeesByBranch || {})
      .reduce((sum: number, count: any) => sum + count, 0) as number;
    
    // Check if full
    if (currentAttendees >= schedule.maxAttendees) {
      return NextResponse.json(
        { error: 'This schedule is full' },
        { status: 400 }
      );
    }
    
    // Check if will exceed capacity
    if (currentAttendees + data.attendeeCount > schedule.maxAttendees) {
      return NextResponse.json(
        { error: `Only ${schedule.maxAttendees - currentAttendees} seats available` },
        { status: 400 }
      );
    }
    
    // Prepare registration data
    const registrationData = {
      ...data,
      scheduleDate: new Date(data.scheduleDate),
      registeredAt: FieldValue.serverTimestamp(),
      status: 'confirmed',
      // Convert student birthdates
      students: data.students?.map((s: any) => ({
        ...s,
        birthdate: s.birthdate ? new Date(s.birthdate) : null
      })) || []
    };
    
    // Create registration
    const registrationRef = await adminDb
      .collection('eventRegistrations')
      .add(registrationData);
    
    console.log('[API] Registration created:', registrationRef.id);
    
    // Update schedule attendee count
    const currentBranchCount = schedule.attendeesByBranch?.[data.branchId] || 0;
    const newTotal = currentAttendees + data.attendeeCount;
    
    await adminDb
      .collection('eventSchedules')
      .doc(data.scheduleId)
      .update({
        [`attendeesByBranch.${data.branchId}`]: currentBranchCount + data.attendeeCount,
        status: newTotal >= schedule.maxAttendees ? 'full' : 'available'
      });
    
    console.log('[API] Schedule updated');
    
    return NextResponse.json({
      success: true,
      registrationId: registrationRef.id
    });
    
  } catch (error: any) {
    console.error('[API] Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create registration' },
      { status: 500 }
    );
  }
}