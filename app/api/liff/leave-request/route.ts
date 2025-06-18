// app/api/liff/leave-request/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createMakeupRequest, checkMakeupExists } from '@/lib/services/makeup';
import { getClass } from '@/lib/services/classes';
import { getStudentWithParent } from '@/lib/services/parents';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, classId, scheduleId, reason, type } = body;

    // Validate required fields
    if (!studentId || !classId || !scheduleId) {
      return NextResponse.json(
        { message: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    // Check if makeup already exists
    const existingMakeup = await checkMakeupExists(studentId, classId, scheduleId);
    if (existingMakeup) {
      return NextResponse.json(
        { message: 'มีการขอลาสำหรับคลาสนี้แล้ว' },
        { status: 400 }
      );
    }

    // Get class info to validate
    const classData = await getClass(classId);
    if (!classData) {
      return NextResponse.json(
        { message: 'ไม่พบข้อมูลคลาส' },
        { status: 404 }
      );
    }

    // Get student with parent info
    const studentWithParent = await getStudentWithParent(studentId);
    if (!studentWithParent) {
      return NextResponse.json(
        { message: 'ไม่พบข้อมูลนักเรียน' },
        { status: 404 }
      );
    }

    // Create makeup request
    const makeupId = await createMakeupRequest({
      type: type || 'scheduled',
      originalClassId: classId,
      originalScheduleId: scheduleId,
      studentId: studentId,
      parentId: studentWithParent.parentId,
      requestDate: new Date(),
      requestedBy: 'parent-liff', // Indicate it's from LIFF
      reason: reason || 'ลาผ่านระบบ LIFF',
      status: 'pending'
    });

    return NextResponse.json({
      success: true,
      makeupId,
      message: 'บันทึกการลาเรียนเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('Error creating leave request:', error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกการลา',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}