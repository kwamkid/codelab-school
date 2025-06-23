// app/api/test/makeup-notification/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { sendMakeupNotification } from '@/lib/services/line-notifications';
import { getMakeupClass } from '@/lib/services/makeup';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { makeupId, type = 'scheduled' } = body;

    if (!makeupId) {
      return NextResponse.json(
        { success: false, message: 'Makeup ID is required' },
        { status: 400 }
      );
    }

    console.log('=== Testing Makeup Notification ===');
    console.log('Makeup ID:', makeupId);
    console.log('Type:', type);

    // Step 1: Get makeup data
    const makeup = await getMakeupClass(makeupId);
    if (!makeup) {
      return NextResponse.json(
        { success: false, message: 'Makeup class not found' },
        { status: 404 }
      );
    }
    console.log('Makeup data:', {
      id: makeup.id,
      status: makeup.status,
      studentId: makeup.studentId,
      parentId: makeup.parentId,
      hasSchedule: !!makeup.makeupSchedule
    });

    // Step 2: Check if makeup is scheduled
    if (makeup.status !== 'scheduled' || !makeup.makeupSchedule) {
      return NextResponse.json({
        success: false,
        message: 'Makeup class is not scheduled yet',
        data: {
          status: makeup.status,
          hasSchedule: !!makeup.makeupSchedule
        }
      });
    }

    // Step 3: Get student and parent data directly from Firestore
    // Get student
    let studentData = null;
    try {
      const studentRef = doc(db, 'parents', makeup.parentId, 'students', makeup.studentId);
      const studentDoc = await getDoc(studentRef);
      if (studentDoc.exists()) {
        studentData = { id: studentDoc.id, ...studentDoc.data() };
      }
    } catch (error) {
      console.error('Error getting student:', error);
    }

    if (!studentData) {
      return NextResponse.json({
        success: false,
        message: 'Student not found',
        data: { parentId: makeup.parentId, studentId: makeup.studentId }
      });
    }
    console.log('Student:', {
      name: studentData.name,
      nickname: studentData.nickname
    });

    // Get parent
    let parentData = null;
    try {
      const parentRef = doc(db, 'parents', makeup.parentId);
      const parentDoc = await getDoc(parentRef);
      if (parentDoc.exists()) {
        parentData = { id: parentDoc.id, ...parentDoc.data() };
      }
    } catch (error) {
      console.error('Error getting parent:', error);
    }

    if (!parentData) {
      return NextResponse.json({
        success: false,
        message: 'Parent not found'
      });
    }
    console.log('Parent:', {
      displayName: parentData.displayName,
      hasLineId: !!parentData.lineUserId,
      lineUserId: parentData.lineUserId ? 'EXISTS' : 'NOT_EXISTS'
    });

    if (!parentData.lineUserId) {
      return NextResponse.json({
        success: false,
        message: 'Parent does not have LINE ID connected',
        data: {
          parentId: parentData.id,
          parentName: parentData.displayName
        }
      });
    }

    // Step 4: Try to send notification
    console.log('Attempting to send notification...');
    
    try {
      const success = await sendMakeupNotification(makeupId, type as 'scheduled' | 'reminder');
      
      console.log('Notification result:', success);

      return NextResponse.json({
        success,
        message: success ? 'Notification sent successfully' : 'Failed to send notification',
        data: {
          makeupId,
          studentName: studentData.name,
          parentName: parentData.displayName,
          hasLineId: !!parentData.lineUserId,
          scheduleDate: makeup.makeupSchedule.date,
          scheduleTime: `${makeup.makeupSchedule.startTime} - ${makeup.makeupSchedule.endTime}`
        }
      });
    } catch (notifError) {
      console.error('Notification error:', notifError);
      return NextResponse.json({
        success: false,
        message: 'Error sending notification',
        error: notifError instanceof Error ? notifError.message : 'Unknown error',
        data: {
          makeupId,
          studentName: studentData.name,
          parentName: parentData.displayName
        }
      });
    }

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}