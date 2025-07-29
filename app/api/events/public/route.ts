import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (eventId) {
      // Get single event
      const eventDoc = await adminDb
        .collection('events')
        .doc(eventId)
        .get();
        
      if (!eventDoc.exists) {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }
      
      const eventData = eventDoc.data()!;
      const event = {
        id: eventDoc.id,
        ...eventData,
        registrationStartDate: eventData.registrationStartDate?.toDate() || new Date(),
        registrationEndDate: eventData.registrationEndDate?.toDate() || new Date(),
        createdAt: eventData.createdAt?.toDate() || new Date(),
        updatedAt: eventData.updatedAt?.toDate()
      };
      
      return NextResponse.json({ event });
      
    } else {
      // Get all published events
      const eventsSnapshot = await adminDb
        .collection('events')
        .where('status', '==', 'published')
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .get();
      
      const events = eventsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          registrationStartDate: data.registrationStartDate?.toDate() || new Date(),
          registrationEndDate: data.registrationEndDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate()
        };
      });
      
      return NextResponse.json({ events });
    }
    
  } catch (error: any) {
    console.error('[API] Error getting events:', error);
    return NextResponse.json(
      { error: 'Failed to get events' },
      { status: 500 }
    );
  }
}

// Get event schedules
export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json();
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID required' },
        { status: 400 }
      );
    }
    
    const schedulesSnapshot = await adminDb
      .collection('eventSchedules')
      .where('eventId', '==', eventId)
      .orderBy('date', 'asc')
      .get();
    
    const schedules = schedulesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date()
      };
    });
    
    return NextResponse.json({ schedules });
    
  } catch (error: any) {
    console.error('[API] Error getting schedules:', error);
    return NextResponse.json(
      { error: 'Failed to get schedules' },
      { status: 500 }
    );
  }
}