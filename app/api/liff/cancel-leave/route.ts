// app/api/liff/cancel-leave/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { makeupId, studentId, classId, scheduleId } = body;

    // Validate required fields
    if (!makeupId || !studentId || !classId || !scheduleId) {
      return NextResponse.json(
        { success: false, message: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    // Get makeup request
    const makeupDoc = await adminDb
      .collection('makeupClasses')
      .doc(makeupId)
      .get();

    if (!makeupDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบข้อมูลการลา' },
        { status: 404 }
      );
    }

    const makeup = makeupDoc.data();

    // Check if can cancel
    if (makeup?.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'ไม่สามารถยกเลิกได้ เนื่องจากมีการนัดเรียนชดเชยแล้ว' },
        { status: 400 }
      );
    }

    // Check if the original class date is in the future
    const now = new Date();
    const originalDate = makeup?.originalSessionDate?.toDate() || new Date();
    
    if (originalDate < now) {
      return NextResponse.json(
        { success: false, message: 'ไม่สามารถยกเลิกการลาย้อนหลังได้' },
        { status: 400 }
      );
    }

    // Delete makeup request
    await adminDb
      .collection('makeupClasses')
      .doc(makeupId)
      .delete();

    // Update attendance record - remove the absence
    try {
      const scheduleDoc = await adminDb
        .collection('classes')
        .doc(classId)
        .collection('schedules')
        .doc(scheduleId)
        .get();

      if (scheduleDoc.exists) {
        const scheduleData = scheduleDoc.data();
        const currentAttendance = scheduleData?.attendance || [];
        
        // Remove the absence record for this student
        const updatedAttendance = currentAttendance.filter(
          (att: any) => att.studentId !== studentId
        );
        
        await adminDb
          .collection('classes')
          .doc(classId)
          .collection('schedules')
          .doc(scheduleId)
          .update({ attendance: updatedAttendance });
      }
    } catch (updateError) {
      console.error('[Cancel Leave] Error updating attendance:', updateError);
      // Continue even if attendance update fails
    }

    console.log(`[Cancel Leave] Cancelled makeup request ${makeupId} for student ${studentId}`);

    return NextResponse.json({
      success: true,
      message: 'ยกเลิกการลาเรียนเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('[Cancel Leave] Error:', error);
    
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    );
  }
}