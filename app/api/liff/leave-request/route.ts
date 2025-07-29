// app/api/liff/leave-request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, classId, scheduleId, reason, type } = body;

    // Validate required fields
    if (!studentId || !classId || !scheduleId) {
      return NextResponse.json(
        { success: false, message: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    // Get enrollment to find parentId
    const enrollmentsSnapshot = await adminDb
      .collection('enrollments')
      .where('studentId', '==', studentId)
      .where('classId', '==', classId)
      .where('status', '==', 'active')
      .get();

    if (enrollmentsSnapshot.empty) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบข้อมูลการลงทะเบียน' },
        { status: 404 }
      );
    }

    const enrollment = enrollmentsSnapshot.docs[0].data();
    const parentId = enrollment.parentId;

    // Get class schedule details
    const scheduleDoc = await adminDb
      .collection('classes')
      .doc(classId)
      .collection('schedules')
      .doc(scheduleId)
      .get();

    if (!scheduleDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบข้อมูลคาบเรียน' },
        { status: 404 }
      );
    }

    const schedule = scheduleDoc.data();

    // Check if schedule is in the future
    const now = new Date();
    const scheduleDate = schedule?.sessionDate?.toDate() || new Date();
    
    if (scheduleDate < now) {
      return NextResponse.json(
        { success: false, message: 'ไม่สามารถลาย้อนหลังได้' },
        { status: 400 }
      );
    }

    // Check if makeup already exists
    const existingMakeupSnapshot = await adminDb
      .collection('makeupClasses')
      .where('studentId', '==', studentId)
      .where('originalClassId', '==', classId)
      .where('originalScheduleId', '==', scheduleId)
      .where('status', 'in', ['pending', 'scheduled'])
      .get();

    if (!existingMakeupSnapshot.empty) {
      return NextResponse.json(
        { success: false, message: 'มีการขอลาในคาบนี้แล้ว' },
        { status: 400 }
      );
    }

    // Create makeup request
    const makeupData = {
      type: type || 'scheduled',
      originalClassId: classId,
      originalScheduleId: scheduleId,
      studentId: studentId,
      parentId: parentId,
      requestDate: FieldValue.serverTimestamp(),
      requestedBy: 'parent-liff', // Indicate it's from LIFF
      reason: reason || 'ลาผ่านระบบ LIFF',
      status: 'pending',
      originalSessionNumber: schedule?.sessionNumber || 0,
      originalSessionDate: schedule?.sessionDate || null,
      createdAt: FieldValue.serverTimestamp()
    };

    const makeupRef = await adminDb.collection('makeupClasses').add(makeupData);

    // Update the schedule attendance (mark as absent)
    try {
      // First, get the current attendance array
      const currentSchedule = await adminDb
        .collection('classes')
        .doc(classId)
        .collection('schedules')
        .doc(scheduleId)
        .get();
      
      const currentData = currentSchedule.data();
      const currentAttendance = currentData?.attendance || [];
      
      // Check if student already has attendance record
      const existingIndex = currentAttendance.findIndex((a: any) => a.studentId === studentId);
      
      if (existingIndex >= 0) {
        // Update existing attendance
        currentAttendance[existingIndex] = {
          studentId: studentId,
          status: 'absent',
          note: 'ลาผ่านระบบ LIFF',
          checkedAt: new Date(),
          checkedBy: 'parent-liff'
        };
      } else {
        // Add new attendance
        currentAttendance.push({
          studentId: studentId,
          status: 'absent',
          note: 'ลาผ่านระบบ LIFF',
          checkedAt: new Date(),
          checkedBy: 'parent-liff'
        });
      }
      
      // Update with the modified array
      await adminDb
        .collection('classes')
        .doc(classId)
        .collection('schedules')
        .doc(scheduleId)
        .update({ attendance: currentAttendance });
        
    } catch (updateError) {
      console.error('[LIFF Leave Request] Error updating attendance:', updateError);
      // Continue even if attendance update fails
    }

    // Log the request
    console.log(`[LIFF Leave Request] Created makeup request ${makeupRef.id} for student ${studentId}`);

    return NextResponse.json({
      success: true,
      message: 'บันทึกการลาเรียนเรียบร้อยแล้ว',
      makeupId: makeupRef.id
    });

  } catch (error) {
    console.error('[LIFF Leave Request] Error:', error);
    
    // Check if it's a permission error
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json(
        { success: false, message: 'ไม่มีสิทธิ์ในการดำเนินการ' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    );
  }
}