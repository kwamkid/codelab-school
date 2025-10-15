// app/api/notifications/test/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sendClassReminder } from '@/lib/services/line-notifications';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, studentId, classId, scheduleDate } = body;
    
    console.log('\n=== Test Notification ===');
    console.log('Type:', type);
    console.log('Data:', { studentId, classId, scheduleDate });
    
    let result: { success: boolean; error?: string } = { success: false };
    
    if (type === 'class-reminder') {
      if (!studentId || !classId) {
        return NextResponse.json({
          success: false,
          message: 'Missing studentId or classId'
        }, { status: 400 });
      }
      
      // ถ้าไม่ได้ส่ง scheduleDate มา ให้ใช้วันพรุ่งนี้
      const tomorrow = scheduleDate ? new Date(scheduleDate) : new Date();
      if (!scheduleDate) {
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
      }
      
      console.log('Sending class reminder for tomorrow:', tomorrow.toISOString());
      
      result = await sendClassReminder(studentId, classId, tomorrow) 
        ? { success: true } 
        : { success: false, error: 'Failed to send' };
    } else {
      return NextResponse.json({
        success: false,
        message: 'Invalid notification type'
      }, { status: 400 });
    }
    
    if (result.success) {
      console.log('✓ Notification sent successfully');
      return NextResponse.json({
        success: true,
        message: 'ส่งการแจ้งเตือนสำเร็จ'
      });
    } else {
      console.log('✗ Failed to send notification:', result.error);
      return NextResponse.json({
        success: false,
        message: result.error || 'ไม่สามารถส่งการแจ้งเตือนได้'
      });
    }
    
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET: ดึงข้อมูลสำหรับทดสอบ
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type');
    const parentId = searchParams.get('parentId');
    const studentId = searchParams.get('studentId');
    
    if (!dataType) {
      return NextResponse.json({
        success: false,
        message: 'Missing type parameter'
      }, { status: 400 });
    }
    
    let data: any[] = [];
    
    switch (dataType) {
      case 'parents-with-line': {
        // ดึงผู้ปกครองที่มี LINE ID
        const parentsQuery = query(
          collection(db, 'parents'),
          where('lineUserId', '!=', null),
          limit(100)
        );
        
        const snapshot = await getDocs(parentsQuery);
        
        data = snapshot.docs.map(doc => ({
          id: doc.id,
          displayName: doc.data().displayName,
          phone: doc.data().phone,
          lineUserId: doc.data().lineUserId
        }));
        
        break;
      }
      
      case 'students-by-parent': {
        // ดึงนักเรียนของผู้ปกครอง
        if (!parentId) {
          return NextResponse.json({
            success: false,
            message: 'Missing parentId parameter'
          }, { status: 400 });
        }
        
        const studentsQuery = query(
          collection(db, 'parents', parentId, 'students'),
          where('isActive', '==', true)
        );
        
        const snapshot = await getDocs(studentsQuery);
        
        data = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          nickname: doc.data().nickname,
          profileImage: doc.data().profileImage
        }));
        
        break;
      }
      
      case 'classes-by-student': {
        // ดึงคลาสของนักเรียน
        if (!studentId) {
          return NextResponse.json({
            success: false,
            message: 'Missing studentId parameter'
          }, { status: 400 });
        }
        
        // Get active enrollments
        const enrollmentsQuery = query(
          collection(db, 'enrollments'),
          where('studentId', '==', studentId),
          where('status', '==', 'active')
        );
        
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        
        // Get class details for each enrollment
        for (const enrollDoc of enrollmentsSnapshot.docs) {
          const enrollment = enrollDoc.data();
          
          try {
            const classDoc = await getDoc(doc(db, 'classes', enrollment.classId));
            
            if (classDoc.exists()) {
              const classData = classDoc.data();
              
              // Skip draft or cancelled classes
              if (classData.status === 'draft' || classData.status === 'cancelled') {
                continue;
              }
              
              // Get subject name
              let subjectName = 'ไม่ระบุ';
              try {
                const subjectDoc = await getDoc(doc(db, 'subjects', classData.subjectId));
                if (subjectDoc.exists()) {
                  subjectName = subjectDoc.data().name;
                }
              } catch (err) {
                console.error('Error getting subject:', err);
              }
              
              // Get branch name
              let branchName = 'ไม่ระบุ';
              try {
                const branchDoc = await getDoc(doc(db, 'branches', classData.branchId));
                if (branchDoc.exists()) {
                  branchName = branchDoc.data().name;
                }
              } catch (err) {
                console.error('Error getting branch:', err);
              }
              
              data.push({
                enrollmentId: enrollDoc.id,
                classId: enrollment.classId,
                className: classData.name,
                classCode: classData.code,
                subjectName: subjectName,
                branchName: branchName,
                status: classData.status,
                startTime: classData.startTime,
                endTime: classData.endTime,
                daysOfWeek: classData.daysOfWeek
              });
            }
          } catch (err) {
            console.error(`Error getting class ${enrollment.classId}:`, err);
          }
        }
        
        break;
      }
      
      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid data type'
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      data
    });
    
  } catch (error) {
    console.error('Get test data error:', error);
    return NextResponse.json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}