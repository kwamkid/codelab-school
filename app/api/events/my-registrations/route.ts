import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lineUserId = searchParams.get('lineUserId');
    
    if (!lineUserId) {
      return NextResponse.json(
        { error: 'LINE User ID required' },
        { status: 400 }
      );
    }
    
    // Get user's registrations
    const registrationsSnapshot = await adminDb
      .collection('eventRegistrations')
      .where('lineUserId', '==', lineUserId)
      .orderBy('scheduleDate', 'desc')
      .get();
    
    const registrations = registrationsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        scheduleDate: data.scheduleDate?.toDate() || new Date(),
        registeredAt: data.registeredAt?.toDate() || new Date(),
        cancelledAt: data.cancelledAt?.toDate(),
        attendanceCheckedAt: data.attendanceCheckedAt?.toDate(),
        students: data.students?.map((s: any) => ({
          ...s,
          birthdate: s.birthdate?.toDate() || new Date()
        })) || []
      };
    });
    
    return NextResponse.json({ registrations });
    
  } catch (error: any) {
    console.error('[API] Error getting user registrations:', error);
    return NextResponse.json(
      { error: 'Failed to get registrations' },
      { status: 500 }
    );
  }
}