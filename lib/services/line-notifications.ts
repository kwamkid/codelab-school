// lib/services/line-notifications.ts

import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { formatDate, formatTime, getDayName } from '@/lib/utils';

// ดึง LINE settings
async function getLineSettings() {
  const docRef = doc(db, 'settings', 'line');
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

// ส่งข้อความผ่าน LINE API (รองรับทั้ง text และ flex)
export async function sendLineMessage(
  userId: string,
  message: string,
  accessToken?: string,
  options?: {
    useFlexMessage?: boolean;
    flexTemplate?: string;
    flexData?: any;
    altText?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // ถ้าไม่ได้ส่ง token มา ให้ดึงจาก settings
    if (!accessToken) {
      const settings = await getLineSettings();
      accessToken = settings?.messagingChannelAccessToken;
    }
    
    if (!accessToken) {
      return { success: false, error: 'ไม่พบ Channel Access Token' };
    }
    
    // ถ้าต้องการส่งแบบ Flex Message
    if (options?.useFlexMessage && options?.flexTemplate && options?.flexData) {
      const response = await fetch('/api/line/send-flex-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          template: options.flexTemplate,
          data: options.flexData,
          altText: options.altText || message.split('\n')[0], // ใช้บรรทัดแรกเป็น alt text
          accessToken 
        })
      });
      
      const result = await response.json();
      return result;
    }
    
    // ส่งแบบ text ปกติ
    const response = await fetch('/api/line/send-message-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId, 
        message,
        accessToken 
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending LINE message:', error);
    return { success: false, error: 'เกิดข้อผิดพลาด' };
  }
}

// 1. แจ้งเตือนก่อนเรียน (คลาสปกติ)
export async function sendClassReminder(
  studentId: string,
  classId: string,
  scheduleDate: Date
): Promise<boolean> {
  try {
    // ดึงข้อมูลนักเรียน - ใช้วิธีตรงๆ แทน
    const enrollmentsQuery = query(
      collection(db, 'enrollments'),
      where('studentId', '==', studentId),
      where('classId', '==', classId),
      where('status', '==', 'active')
    );
    const enrollmentSnapshot = await getDocs(enrollmentsQuery);
    
    if (enrollmentSnapshot.empty) {
      console.log('No active enrollment found');
      return false;
    }
    
    const enrollment = enrollmentSnapshot.docs[0].data();
    const parentId = enrollment.parentId;
    
    // ดึงข้อมูลผู้ปกครอง
    const parentDoc = await getDoc(doc(db, 'parents', parentId));
    if (!parentDoc.exists() || !parentDoc.data().lineUserId) {
      console.log('Parent not found or no LINE ID');
      return false;
    }
    const parent = parentDoc.data();
    
    // ดึงข้อมูลนักเรียน
    const studentDoc = await getDoc(doc(db, 'parents', parentId, 'students', studentId));
    if (!studentDoc.exists()) {
      console.log('Student not found');
      return false;
    }
    const student = studentDoc.data();
    
    // ดึงข้อมูลคลาส
    const classDoc = await getDoc(doc(db, 'classes', classId));
    if (!classDoc.exists()) return false;
    const classData = classDoc.data();
    
    // ดึงข้อมูลวิชา
    const subjectDoc = await getDoc(doc(db, 'subjects', classData.subjectId));
    const subject = subjectDoc.exists() ? subjectDoc.data() : null;
    
    // ดึงข้อมูลครู
    const teacherDoc = await getDoc(doc(db, 'teachers', classData.teacherId));
    const teacher = teacherDoc.exists() ? teacherDoc.data() : null;
    
    // ดึงข้อมูลสาขา
    const branchDoc = await getDoc(doc(db, 'branches', classData.branchId));
    const branch = branchDoc.exists() ? branchDoc.data() : null;
    
    // ดึงข้อมูลห้อง
    const roomDoc = await getDoc(doc(db, 'branches', classData.branchId, 'rooms', classData.roomId));
    const room = roomDoc.exists() ? roomDoc.data() : null;
    
    // ดึง template
    const settings = await getLineSettings();
    let template = settings?.notificationTemplates?.classReminder || 
      'แจ้งเตือน: น้อง{studentName} มีคลาส {subjectName} พรุ่งนี้\n📅 {date}\n⏰ {time}\n📍 {location}\n\nอย่าลืมมาเรียนนะคะ 😊';
    
    // แทนที่ตัวแปร
    const message = template
      .replace('{studentName}', student.nickname || student.name)
      .replace('{subjectName}', subject?.name || classData.name)
      .replace('{date}', formatDate(scheduleDate, 'full'))
      .replace('{time}', `${formatTime(classData.startTime)} - ${formatTime(classData.endTime)}`)
      .replace('{location}', `${branch?.name || ''} ${room?.name ? 'ห้อง ' + room.name : ''}`);
    
    // ส่งข้อความแบบ Flex Message
    const result = await sendLineMessage(parent.lineUserId, message, undefined, {
      useFlexMessage: true,
      flexTemplate: 'classReminder',
      flexData: {
        studentName: student.nickname || student.name,
        className: classData.name,
        sessionNumber: undefined, // จะเพิ่มเมื่อมีข้อมูล session number
        date: formatDate(scheduleDate, 'long'),
        startTime: formatTime(classData.startTime),
        endTime: formatTime(classData.endTime),
        teacherName: `ครู${teacher?.nickname || teacher?.name || 'ไม่ระบุ'}`,
        location: branch?.name || '',
        roomName: room?.name || classData.roomId
      },
      altText: `แจ้งเตือนคลาสเรียนพรุ่งนี้ - น้อง${student.nickname || student.name}`
    });
    
    if (result.success) {
      console.log(`Sent class reminder for student ${studentId} class ${classId}`);
    }
    
    return result.success;
  } catch (error) {
    console.error('Error sending class reminder:', error);
    return false;
  }
}

// 2. แจ้งเตือน Makeup Class
export async function sendMakeupNotification(
  makeupId: string,
  type: 'scheduled' | 'reminder'
): Promise<boolean> {
  try {
    // ดึงข้อมูล makeup
    const makeupDoc = await getDoc(doc(db, 'makeupClasses', makeupId));
    if (!makeupDoc.exists()) {
      console.log('Makeup not found');
      return false;
    }
    const makeup = makeupDoc.data();
    
    if (!makeup.makeupSchedule) {
      console.log('No makeup schedule');
      return false;
    }
    
    // ดึงข้อมูลผู้ปกครอง
    const parentDoc = await getDoc(doc(db, 'parents', makeup.parentId));
    if (!parentDoc.exists() || !parentDoc.data().lineUserId) {
      console.log('Parent not found or no LINE ID');
      return false;
    }
    const parent = parentDoc.data();
    
    // ดึงข้อมูลนักเรียน
    const studentDoc = await getDoc(doc(db, 'parents', makeup.parentId, 'students', makeup.studentId));
    if (!studentDoc.exists()) {
      console.log('Student not found');
      return false;
    }
    const student = studentDoc.data();
    
    // ดึงข้อมูลคลาสเดิม
    const classDoc = await getDoc(doc(db, 'classes', makeup.originalClassId));
    const classData = classDoc.exists() ? classDoc.data() : null;
    
    // ดึงข้อมูลวิชา
    const subjectDoc = classData ? await getDoc(doc(db, 'subjects', classData.subjectId)) : null;
    const subject = subjectDoc?.exists() ? subjectDoc.data() : null;
    
    // ดึงข้อมูลครู
    const teacherDoc = await getDoc(doc(db, 'teachers', makeup.makeupSchedule.teacherId));
    const teacher = teacherDoc.exists() ? teacherDoc.data() : null;
    
    // ดึงข้อมูลสาขาและห้อง
    const branchDoc = await getDoc(doc(db, 'branches', makeup.makeupSchedule.branchId));
    const branch = branchDoc.exists() ? branchDoc.data() : null;
    
    const roomDoc = await getDoc(doc(db, 'branches', makeup.makeupSchedule.branchId, 'rooms', makeup.makeupSchedule.roomId));
    const room = roomDoc.exists() ? roomDoc.data() : null;
    
    // ดึง template
    const settings = await getLineSettings();
    let template = settings?.notificationTemplates?.makeupConfirmation || 
      'ยืนยันการเรียนชดเชย\n\nน้อง{studentName}\nวิชา: {subjectName}\n📅 {date}\n⏰ {time}\n👩‍🏫 ครู{teacherName}\n📍 {location}';
    
    // แปลง Timestamp เป็น Date
    const makeupDate = makeup.makeupSchedule.date.toDate ? makeup.makeupSchedule.date.toDate() : new Date(makeup.makeupSchedule.date);
    
    // แทนที่ตัวแปร - ใช้ formatDate แบบ 'long' เพื่อไม่ให้มีเวลา
    let message = template
      .replace('{studentName}', student.nickname || student.name)
      .replace('{subjectName}', subject?.name || classData?.name || 'ไม่ระบุ')
      .replace('{date}', formatDate(makeupDate, 'long'))  // เปลี่ยนจาก 'full' เป็น 'long'
      .replace('{time}', `${formatTime(makeup.makeupSchedule.startTime)} - ${formatTime(makeup.makeupSchedule.endTime)}`)
      .replace('{teacherName}', teacher?.nickname || teacher?.name || 'ไม่ระบุ')
      .replace('{location}', `${branch?.name || ''} ${room?.name ? 'ห้อง ' + room.name : ''}`);
    
    // ถ้าเป็น reminder (แจ้งเตือนก่อนเรียน 1 วัน)
    if (type === 'reminder') {
      message = `⏰ [แจ้งเตือน Makeup Class พรุ่งนี้]\n\n${message}`;
    } else {
      // type: 'scheduled' (แจ้งเตือนตอนนัดวัน)
      message = `✅ [ยืนยันการนัด Makeup Class]\n\n${message}\n\nหากติดปัญหาหรือต้องการเปลี่ยนแปลง กรุณาติดต่อเจ้าหน้าที่`;
    }
    
    // ส่งข้อความแบบ Flex Message
    const result = await sendLineMessage(parent.lineUserId, message, undefined, {
      useFlexMessage: true,
      flexTemplate: type === 'reminder' ? 'makeupReminder' : 'makeupConfirmation',
      flexData: {
        studentName: student.nickname || student.name,
        className: classData?.name || 'Makeup Class',
        sessionNumber: makeup.originalSessionNumber,
        date: formatDate(makeupDate, 'long'),
        startTime: formatTime(makeup.makeupSchedule.startTime),
        endTime: formatTime(makeup.makeupSchedule.endTime),
        teacherName: `ครู${teacher?.nickname || teacher?.name || 'ไม่ระบุ'}`,
        location: branch?.name || '',
        roomName: room?.name || makeup.makeupSchedule.roomId
      },
      altText: type === 'reminder' 
        ? `แจ้งเตือน Makeup Class พรุ่งนี้ - น้อง${student.nickname || student.name}`
        : `ยืนยันการนัด Makeup Class - น้อง${student.nickname || student.name}`
    });
    
    if (result.success) {
      console.log(`Sent makeup ${type} for makeup ${makeupId}`);
    } else {
      console.error(`Failed to send makeup ${type}:`, result.error);
    }
    
    return result.success;
  } catch (error) {
    console.error('Error sending makeup notification:', error);
    return false;
  }
}

// 3. ยืนยันการจองทดลองเรียน
export async function sendTrialConfirmation(
  trialSessionId: string
): Promise<boolean> {
  try {
    const trialDoc = await getDoc(doc(db, 'trialSessions', trialSessionId));
    if (!trialDoc.exists()) return false;
    const trial = trialDoc.data();
    
    // ดึงข้อมูล booking
    const bookingDoc = await getDoc(doc(db, 'trialBookings', trial.bookingId));
    if (!bookingDoc.exists()) return false;
    const booking = bookingDoc.data();
    
    // ถ้าไม่มี LINE ID ส่งไม่ได้
    if (!booking.parentLineId) return false;
    
    // ดึงข้อมูลวิชา
    const subjectDoc = await getDoc(doc(db, 'subjects', trial.subjectId));
    const subject = subjectDoc.exists() ? subjectDoc.data() : null;
    
    // ดึงข้อมูลสาขา
    const branchDoc = await getDoc(doc(db, 'branches', trial.branchId));
    const branch = branchDoc.exists() ? branchDoc.data() : null;
    
    // ดึง template  
    const settings = await getLineSettings();
    let template = settings?.notificationTemplates?.trialConfirmation || 
      'ยืนยันการทดลองเรียน\n\n✅ จองสำเร็จแล้ว!\nน้อง{studentName}\nวิชา: {subjectName}\n📅 {date}\n⏰ {time}\n📍 {location}\n\nหากต้องการเปลี่ยนแปลง กรุณาติดต่อ {contactPhone}';
    
    const message = template
      .replace('{studentName}', trial.studentName)
      .replace('{subjectName}', subject?.name || 'ไม่ระบุ')
      .replace('{date}', formatDate(trial.scheduledDate.toDate(), 'full'))
      .replace('{time}', `${formatTime(trial.startTime)} - ${formatTime(trial.endTime)}`)
      .replace('{location}', branch?.name || 'ไม่ระบุ')
      .replace('{contactPhone}', branch?.phone || '081-234-5678');
    
    const result = await sendLineMessage(booking.parentLineId, message);
    return result.success;
  } catch (error) {
    console.error('Error sending trial confirmation:', error);
    return false;
  }
}