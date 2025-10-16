// lib/services/makeup.ts - Fixed undefined field error

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { MakeupClass } from '@/types/models';
import { getClassSchedule, updateClassSchedule, getClass } from './classes';
import { getStudentWithParent } from './parents';
import { getBranch } from './branches';
import { getSubject } from './subjects';
import { sendMakeupNotification } from './line-notifications';

const COLLECTION_NAME = 'makeupClasses';

// ... (เก็บ functions อื่นๆ ไว้เหมือนเดิม)

// Get all makeup classes - Now with denormalized data! ✨
export async function getMakeupClasses(branchId?: string | null): Promise<MakeupClass[]> {
  try {
    let makeupQuery;
    
    if (branchId) {
      // Query by branchId directly! 🚀
      makeupQuery = query(
        collection(db, COLLECTION_NAME),
        where('branchId', '==', branchId),
        orderBy('createdAt', 'desc')
      );
    } else {
      makeupQuery = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(makeupQuery);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        type: data.type,
        originalClassId: data.originalClassId,
        originalScheduleId: data.originalScheduleId,
        originalSessionNumber: data.originalSessionNumber,
        originalSessionDate: data.originalSessionDate?.toDate(),
        
        // Denormalized data - ใช้ได้เลย! ✨
        className: data.className || '',
        classCode: data.classCode || '',
        subjectId: data.subjectId || '',
        subjectName: data.subjectName || '',
        
        studentId: data.studentId,
        studentName: data.studentName || '',
        studentNickname: data.studentNickname || '',
        
        parentId: data.parentId,
        parentName: data.parentName || '',
        parentPhone: data.parentPhone || '',
        parentLineUserId: data.parentLineUserId,
        
        branchId: data.branchId || '',
        branchName: data.branchName || '',
        
        requestDate: data.requestDate?.toDate() || new Date(),
        requestedBy: data.requestedBy,
        reason: data.reason,
        status: data.status,
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        makeupSchedule: data.makeupSchedule ? {
          date: data.makeupSchedule.date?.toDate() || new Date(),
          startTime: data.makeupSchedule.startTime,
          endTime: data.makeupSchedule.endTime,
          teacherId: data.makeupSchedule.teacherId,
          teacherName: data.makeupSchedule.teacherName,
          branchId: data.makeupSchedule.branchId,
          roomId: data.makeupSchedule.roomId,
          roomName: data.makeupSchedule.roomName,
          confirmedAt: data.makeupSchedule.confirmedAt?.toDate(),
          confirmedBy: data.makeupSchedule.confirmedBy,
        } : undefined,
        attendance: data.attendance ? {
          status: data.attendance.status,
          checkedBy: data.attendance.checkedBy,
          checkedAt: data.attendance.checkedAt?.toDate() || new Date(),
          note: data.attendance.note,
        } : undefined,
      } as MakeupClass;
    });
  } catch (error) {
    console.error('Error getting makeup classes:', error);
    throw error;
  }
}

// Get makeup classes by student
export async function getMakeupClassesByStudent(studentId: string): Promise<MakeupClass[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        type: data.type,
        originalClassId: data.originalClassId,
        originalScheduleId: data.originalScheduleId,
        originalSessionNumber: data.originalSessionNumber,
        originalSessionDate: data.originalSessionDate?.toDate(),
        
        className: data.className || '',
        classCode: data.classCode || '',
        subjectId: data.subjectId || '',
        subjectName: data.subjectName || '',
        
        studentId: data.studentId,
        studentName: data.studentName || '',
        studentNickname: data.studentNickname || '',
        
        parentId: data.parentId,
        parentName: data.parentName || '',
        parentPhone: data.parentPhone || '',
        parentLineUserId: data.parentLineUserId,
        
        branchId: data.branchId || '',
        branchName: data.branchName || '',
        
        requestDate: data.requestDate?.toDate() || new Date(),
        requestedBy: data.requestedBy,
        reason: data.reason,
        status: data.status,
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        makeupSchedule: data.makeupSchedule ? {
          date: data.makeupSchedule.date?.toDate() || new Date(),
          startTime: data.makeupSchedule.startTime,
          endTime: data.makeupSchedule.endTime,
          teacherId: data.makeupSchedule.teacherId,
          teacherName: data.makeupSchedule.teacherName,
          branchId: data.makeupSchedule.branchId,
          roomId: data.makeupSchedule.roomId,
          roomName: data.makeupSchedule.roomName,
          confirmedAt: data.makeupSchedule.confirmedAt?.toDate(),
          confirmedBy: data.makeupSchedule.confirmedBy,
        } : undefined,
        attendance: data.attendance ? {
          status: data.attendance.status,
          checkedBy: data.attendance.checkedBy,
          checkedAt: data.attendance.checkedAt?.toDate() || new Date(),
          note: data.attendance.note,
        } : undefined,
      } as MakeupClass;
    });
  } catch (error) {
    console.error('Error getting makeup classes by student:', error);
    throw error;
  }
}

// Get makeup classes by class
export async function getMakeupClassesByClass(classId: string): Promise<MakeupClass[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('originalClassId', '==', classId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        type: data.type,
        originalClassId: data.originalClassId,
        originalScheduleId: data.originalScheduleId,
        originalSessionNumber: data.originalSessionNumber,
        originalSessionDate: data.originalSessionDate?.toDate(),
        
        className: data.className || '',
        classCode: data.classCode || '',
        subjectId: data.subjectId || '',
        subjectName: data.subjectName || '',
        
        studentId: data.studentId,
        studentName: data.studentName || '',
        studentNickname: data.studentNickname || '',
        
        parentId: data.parentId,
        parentName: data.parentName || '',
        parentPhone: data.parentPhone || '',
        parentLineUserId: data.parentLineUserId,
        
        branchId: data.branchId || '',
        branchName: data.branchName || '',
        
        requestDate: data.requestDate?.toDate() || new Date(),
        requestedBy: data.requestedBy,
        reason: data.reason,
        status: data.status,
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        makeupSchedule: data.makeupSchedule ? {
          date: data.makeupSchedule.date?.toDate() || new Date(),
          startTime: data.makeupSchedule.startTime,
          endTime: data.makeupSchedule.endTime,
          teacherId: data.makeupSchedule.teacherId,
          teacherName: data.makeupSchedule.teacherName,
          branchId: data.makeupSchedule.branchId,
          roomId: data.makeupSchedule.roomId,
          roomName: data.makeupSchedule.roomName,
          confirmedAt: data.makeupSchedule.confirmedAt?.toDate(),
          confirmedBy: data.makeupSchedule.confirmedBy,
        } : undefined,
        attendance: data.attendance ? {
          status: data.attendance.status,
          checkedBy: data.attendance.checkedBy,
          checkedAt: data.attendance.checkedAt?.toDate() || new Date(),
          note: data.attendance.note,
        } : undefined,
      } as MakeupClass;
    });
  } catch (error) {
    console.error('Error getting makeup classes by class:', error);
    throw error;
  }
}

// Get single makeup class
export async function getMakeupClass(id: string): Promise<MakeupClass | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as any;
      return {
        id: docSnap.id,
        type: data.type,
        originalClassId: data.originalClassId,
        originalScheduleId: data.originalScheduleId,
        originalSessionNumber: data.originalSessionNumber,
        originalSessionDate: data.originalSessionDate?.toDate(),
        
        className: data.className || '',
        classCode: data.classCode || '',
        subjectId: data.subjectId || '',
        subjectName: data.subjectName || '',
        
        studentId: data.studentId,
        studentName: data.studentName || '',
        studentNickname: data.studentNickname || '',
        
        parentId: data.parentId,
        parentName: data.parentName || '',
        parentPhone: data.parentPhone || '',
        parentLineUserId: data.parentLineUserId,
        
        branchId: data.branchId || '',
        branchName: data.branchName || '',
        
        requestDate: data.requestDate?.toDate() || new Date(),
        requestedBy: data.requestedBy,
        reason: data.reason,
        status: data.status,
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        makeupSchedule: data.makeupSchedule ? {
          date: data.makeupSchedule.date?.toDate() || new Date(),
          startTime: data.makeupSchedule.startTime,
          endTime: data.makeupSchedule.endTime,
          teacherId: data.makeupSchedule.teacherId,
          teacherName: data.makeupSchedule.teacherName,
          branchId: data.makeupSchedule.branchId,
          roomId: data.makeupSchedule.roomId,
          roomName: data.makeupSchedule.roomName,
          confirmedAt: data.makeupSchedule.confirmedAt?.toDate(),
          confirmedBy: data.makeupSchedule.confirmedBy,
        } : undefined,
        attendance: data.attendance ? {
          status: data.attendance.status,
          checkedBy: data.attendance.checkedBy,
          checkedAt: data.attendance.checkedAt?.toDate() || new Date(),
          note: data.attendance.note,
        } : undefined,
      } as MakeupClass;
    }
    return null;
  } catch (error) {
    console.error('Error getting makeup class:', error);
    throw error;
  }
}

// Count makeup classes for student in a class
export async function getMakeupCount(studentId: string, classId: string): Promise<number> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentId),
      where('originalClassId', '==', classId),
      where('status', '!=', 'cancelled')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error counting makeup classes:', error);
    return 0;
  }
}

// Check if student can create more makeup for a class
export async function canCreateMakeup(
  studentId: string, 
  classId: string,
  bypassLimit: boolean = false
): Promise<{ allowed: boolean; currentCount: number; limit: number; message?: string }> {
  try {
    const { getMakeupSettings } = await import('./settings');
    const settings = await getMakeupSettings();
    
    if (!settings.autoCreateMakeup && !bypassLimit) {
      return {
        allowed: false,
        currentCount: 0,
        limit: 0,
        message: 'การสร้าง Makeup อัตโนมัติถูกปิดอยู่'
      };
    }
    
    const currentCount = await getMakeupCount(studentId, classId);
    
    if (settings.makeupLimitPerCourse === 0 || bypassLimit) {
      return {
        allowed: true,
        currentCount,
        limit: settings.makeupLimitPerCourse,
      };
    }
    
    const allowed = currentCount < settings.makeupLimitPerCourse;
    
    return {
      allowed,
      currentCount,
      limit: settings.makeupLimitPerCourse,
      message: allowed ? undefined : `เกินจำนวนครั้งที่ชดเชยได้ (${currentCount}/${settings.makeupLimitPerCourse})`
    };
  } catch (error) {
    console.error('Error checking makeup limit:', error);
    return {
      allowed: true,
      currentCount: 0,
      limit: 0
    };
  }
}

// Get makeup requests for specific schedules
export async function getMakeupRequestsBySchedules(
  studentId: string,
  classId: string,
  scheduleIds: string[]
): Promise<Record<string, MakeupClass>> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentId),
      where('originalClassId', '==', classId),
      where('status', '!=', 'cancelled')
    );
    
    const querySnapshot = await getDocs(q);
    const makeupBySchedule: Record<string, MakeupClass> = {};
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data() as any;
      if (scheduleIds.includes(data.originalScheduleId)) {
        makeupBySchedule[data.originalScheduleId] = {
          id: doc.id,
          type: data.type,
          originalClassId: data.originalClassId,
          originalScheduleId: data.originalScheduleId,
          originalSessionNumber: data.originalSessionNumber,
          originalSessionDate: data.originalSessionDate?.toDate(),
          
          className: data.className || '',
          classCode: data.classCode || '',
          subjectId: data.subjectId || '',
          subjectName: data.subjectName || '',
          
          studentId: data.studentId,
          studentName: data.studentName || '',
          studentNickname: data.studentNickname || '',
          
          parentId: data.parentId,
          parentName: data.parentName || '',
          parentPhone: data.parentPhone || '',
          parentLineUserId: data.parentLineUserId,
          
          branchId: data.branchId || '',
          branchName: data.branchName || '',
          
          requestDate: data.requestDate?.toDate() || new Date(),
          requestedBy: data.requestedBy,
          reason: data.reason,
          status: data.status,
          notes: data.notes,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
          makeupSchedule: data.makeupSchedule ? {
            date: data.makeupSchedule.date?.toDate() || new Date(),
            startTime: data.makeupSchedule.startTime,
            endTime: data.makeupSchedule.endTime,
            teacherId: data.makeupSchedule.teacherId,
            teacherName: data.makeupSchedule.teacherName,
            branchId: data.makeupSchedule.branchId,
            roomId: data.makeupSchedule.roomId,
            roomName: data.makeupSchedule.roomName,
            confirmedAt: data.makeupSchedule.confirmedAt?.toDate(),
            confirmedBy: data.makeupSchedule.confirmedBy,
          } : undefined,
          attendance: data.attendance ? {
            status: data.attendance.status,
            checkedBy: data.attendance.checkedBy,
            checkedAt: data.attendance.checkedAt?.toDate() || new Date(),
            note: data.attendance.note,
          } : undefined,
        } as MakeupClass;
      }
    });
    
    return makeupBySchedule;
  } catch (error) {
    console.error('Error getting makeup requests by schedules:', error);
    return {};
  }
}

// Check if makeup already exists for a schedule
export async function checkMakeupExists(
  studentId: string,
  classId: string,
  scheduleId: string
): Promise<MakeupClass | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentId),
      where('originalClassId', '==', classId),
      where('originalScheduleId', '==', scheduleId),
      where('status', '!=', 'cancelled')
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.size > 0) {
      const docData = querySnapshot.docs[0];
      const data = docData.data() as any;
      return {
        id: docData.id,
        type: data.type,
        originalClassId: data.originalClassId,
        originalScheduleId: data.originalScheduleId,
        originalSessionNumber: data.originalSessionNumber,
        originalSessionDate: data.originalSessionDate?.toDate(),
        
        className: data.className || '',
        classCode: data.classCode || '',
        subjectId: data.subjectId || '',
        subjectName: data.subjectName || '',
        
        studentId: data.studentId,
        studentName: data.studentName || '',
        studentNickname: data.studentNickname || '',
        
        parentId: data.parentId,
        parentName: data.parentName || '',
        parentPhone: data.parentPhone || '',
        parentLineUserId: data.parentLineUserId,
        
        branchId: data.branchId || '',
        branchName: data.branchName || '',
        
        requestDate: data.requestDate?.toDate() || new Date(),
        requestedBy: data.requestedBy,
        reason: data.reason,
        status: data.status,
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        makeupSchedule: data.makeupSchedule ? {
          date: data.makeupSchedule.date?.toDate() || new Date(),
          startTime: data.makeupSchedule.startTime,
          endTime: data.makeupSchedule.endTime,
          teacherId: data.makeupSchedule.teacherId,
          teacherName: data.makeupSchedule.teacherName,
          branchId: data.makeupSchedule.branchId,
          roomId: data.makeupSchedule.roomId,
          roomName: data.makeupSchedule.roomName,
          confirmedAt: data.makeupSchedule.confirmedAt?.toDate(),
          confirmedBy: data.makeupSchedule.confirmedBy,
        } : undefined,
        attendance: data.attendance ? {
          status: data.attendance.status,
          checkedBy: data.attendance.checkedBy,
          checkedAt: data.attendance.checkedAt?.toDate() || new Date(),
          note: data.attendance.note,
        } : undefined,
      } as MakeupClass;
    }
    return null;
  } catch (error) {
    console.error('Error checking makeup exists:', error);
    return null;
  }
}

// ✅ FIX: Create makeup class request - แก้ไข undefined error
export async function createMakeupRequest(
  data: Omit<MakeupClass, 'id' | 'createdAt' | 'updatedAt' | 'className' | 'classCode' | 'subjectId' | 'subjectName' | 'studentName' | 'studentNickname' | 'parentName' | 'parentPhone' | 'parentLineUserId' | 'branchId' | 'branchName'>
): Promise<string> {
  try {
    // Check if makeup already exists
    const existingMakeup = await checkMakeupExists(
      data.studentId,
      data.originalClassId,
      data.originalScheduleId
    );
    
    if (existingMakeup) {
      throw new Error('Makeup request already exists for this schedule');
    }
    
    // 🚀 Load all required data for denormalization
    const [student, classData, schedule] = await Promise.all([
      getStudentWithParent(data.studentId),
      getClass(data.originalClassId),
      getClassSchedule(data.originalClassId, data.originalScheduleId)
    ]);
    
    if (!student) {
      throw new Error('Student not found');
    }
    
    if (!classData) {
      throw new Error('Class not found');
    }
    
    // Load additional data
    const [subject, branch] = await Promise.all([
      getSubject(classData.subjectId),
      getBranch(classData.branchId)
    ]);
    
    const batch = writeBatch(db);
    
    // 1. Create makeup request with denormalized data ✨
    const docRef = doc(collection(db, COLLECTION_NAME));
    batch.set(docRef, {
      // Original data
      type: data.type,
      originalClassId: data.originalClassId,
      originalScheduleId: data.originalScheduleId,
      originalSessionNumber: schedule?.sessionNumber || null,
      originalSessionDate: schedule?.sessionDate ? Timestamp.fromDate(schedule.sessionDate) : null,
      
      // Denormalized class data ✨
      className: classData.name,
      classCode: classData.code,
      subjectId: classData.subjectId,
      subjectName: subject?.name || '',
      
      // Student data
      studentId: data.studentId,
      studentName: student.name,
      studentNickname: student.nickname || '',
      
      // Parent data
      parentId: student.parentId,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      // ✅ FIX: ใช้ null แทน undefined เพื่อป้องกัน Firestore error
      parentLineUserId: student.parentLineUserId || null,
      
      // Branch data
      branchId: classData.branchId,
      branchName: branch?.name || '',
      
      // Request info
      requestDate: Timestamp.fromDate(data.requestDate),
      requestedBy: data.requestedBy,
      reason: data.reason,
      status: 'pending',
      notes: data.notes || null,
      createdAt: serverTimestamp(),
    });
    
    // 2. Update original schedule attendance
    if (schedule) {
      const updatedAttendance = schedule.attendance || [];
      const studentIndex = updatedAttendance.findIndex(a => a.studentId === data.studentId);
      
      if (studentIndex >= 0) {
        updatedAttendance[studentIndex] = {
          studentId: data.studentId,
          status: 'absent',
          note: `Makeup requested: ${data.reason}`
        };
      } else {
        updatedAttendance.push({
          studentId: data.studentId,
          status: 'absent',
          note: `Makeup requested: ${data.reason}`
        });
      }
      
      await updateClassSchedule(data.originalClassId, data.originalScheduleId, {
        attendance: updatedAttendance
      });
    }
    
    await batch.commit();
    return docRef.id;
  } catch (error) {
    console.error('Error creating makeup request:', error);
    throw error;
  }
}

// Schedule makeup class with LINE notification
export async function scheduleMakeupClass(
  makeupId: string,
  scheduleData: MakeupClass['makeupSchedule'] & { confirmedBy: string }
): Promise<void> {
  try {
    // Load teacher and room names for denormalization
    const [teacher, room] = await Promise.all([
      import('./teachers').then(m => m.getTeacher(scheduleData.teacherId)),
      import('./rooms').then(m => m.getRoom(scheduleData.branchId, scheduleData.roomId))
    ]);
    
    const docRef = doc(db, COLLECTION_NAME, makeupId);
    
    // Update with denormalized teacher/room names ✨
    await updateDoc(docRef, {
      status: 'scheduled',
      makeupSchedule: {
        ...scheduleData,
        date: Timestamp.fromDate(scheduleData.date),
        teacherName: teacher?.nickname || teacher?.name || null,
        roomName: room?.name || null,
        confirmedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
    
    // Send LINE notification
    try {
      await sendMakeupNotification(makeupId, 'scheduled');
      console.log(`LINE notification sent for scheduled makeup ${makeupId}`);
    } catch (notificationError) {
      console.error('Error sending LINE notification:', notificationError);
    }
  } catch (error) {
    console.error('Error scheduling makeup class:', error);
    throw error;
  }
}

// Record makeup attendance
export async function recordMakeupAttendance(
  makeupId: string,
  attendance: {
    status: 'present' | 'absent';
    checkedBy: string;
    note?: string;
  }
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, makeupId);
    
    await updateDoc(docRef, {
      status: 'completed',
      attendance: {
        ...attendance,
        note: attendance.note || null,
        checkedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error recording makeup attendance:', error);
    throw error;
  }
}

// Cancel makeup class
export async function cancelMakeupClass(
  makeupId: string,
  reason: string,
  cancelledBy: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, makeupId);
    
    await updateDoc(docRef, {
      status: 'cancelled',
      notes: reason,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error cancelling makeup class:', error);
    throw error;
  }
}

// Get upcoming makeup classes for a branch
export async function getUpcomingMakeupClasses(
  branchId: string,
  startDate: Date,
  endDate: Date
): Promise<MakeupClass[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'scheduled'),
      where('branchId', '==', branchId), // Use denormalized branchId! 🚀
      where('makeupSchedule.date', '>=', Timestamp.fromDate(startDate)),
      where('makeupSchedule.date', '<=', Timestamp.fromDate(endDate))
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        type: data.type,
        originalClassId: data.originalClassId,
        originalScheduleId: data.originalScheduleId,
        originalSessionNumber: data.originalSessionNumber,
        originalSessionDate: data.originalSessionDate?.toDate(),
        
        className: data.className || '',
        classCode: data.classCode || '',
        subjectId: data.subjectId || '',
        subjectName: data.subjectName || '',
        
        studentId: data.studentId,
        studentName: data.studentName || '',
        studentNickname: data.studentNickname || '',
        
        parentId: data.parentId,
        parentName: data.parentName || '',
        parentPhone: data.parentPhone || '',
        parentLineUserId: data.parentLineUserId,
        
        branchId: data.branchId || '',
        branchName: data.branchName || '',
        
        requestDate: data.requestDate?.toDate() || new Date(),
        requestedBy: data.requestedBy,
        reason: data.reason,
        status: data.status,
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        makeupSchedule: data.makeupSchedule ? {
          date: data.makeupSchedule.date?.toDate() || new Date(),
          startTime: data.makeupSchedule.startTime,
          endTime: data.makeupSchedule.endTime,
          teacherId: data.makeupSchedule.teacherId,
          teacherName: data.makeupSchedule.teacherName,
          branchId: data.makeupSchedule.branchId,
          roomId: data.makeupSchedule.roomId,
          roomName: data.makeupSchedule.roomName,
          confirmedAt: data.makeupSchedule.confirmedAt?.toDate(),
          confirmedBy: data.makeupSchedule.confirmedBy,
        } : undefined,
      } as MakeupClass;
    });
  } catch (error) {
    console.error('Error getting upcoming makeup classes:', error);
    throw error;
  }
}

// Get makeup classes that need reminder tomorrow
export async function getMakeupClassesForReminder(tomorrowDate: Date): Promise<MakeupClass[]> {
  try {
    const startOfDay = new Date(tomorrowDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(tomorrowDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'scheduled'),
      where('makeupSchedule.date', '>=', Timestamp.fromDate(startOfDay)),
      where('makeupSchedule.date', '<=', Timestamp.fromDate(endOfDay))
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        type: data.type,
        originalClassId: data.originalClassId,
        originalScheduleId: data.originalScheduleId,
        originalSessionNumber: data.originalSessionNumber,
        originalSessionDate: data.originalSessionDate?.toDate(),
        
        className: data.className || '',
        classCode: data.classCode || '',
        subjectId: data.subjectId || '',
        subjectName: data.subjectName || '',
        
        studentId: data.studentId,
        studentName: data.studentName || '',
        studentNickname: data.studentNickname || '',
        
        parentId: data.parentId,
        parentName: data.parentName || '',
        parentPhone: data.parentPhone || '',
        parentLineUserId: data.parentLineUserId,
        
        branchId: data.branchId || '',
        branchName: data.branchName || '',
        
        requestDate: data.requestDate?.toDate() || new Date(),
        requestedBy: data.requestedBy,
        reason: data.reason,
        status: data.status,
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        makeupSchedule: data.makeupSchedule ? {
          date: data.makeupSchedule.date?.toDate() || new Date(),
          startTime: data.makeupSchedule.startTime,
          endTime: data.makeupSchedule.endTime,
          teacherId: data.makeupSchedule.teacherId,
          teacherName: data.makeupSchedule.teacherName,
          branchId: data.makeupSchedule.branchId,
          roomId: data.makeupSchedule.roomId,
          roomName: data.makeupSchedule.roomName,
          confirmedAt: data.makeupSchedule.confirmedAt?.toDate(),
          confirmedBy: data.makeupSchedule.confirmedBy,
        } : undefined,
      } as MakeupClass;
    });
  } catch (error) {
    console.error('Error getting makeup classes for reminder:', error);
    return [];
  }
}

// Update makeup attendance
export async function updateMakeupAttendance(
  makeupId: string,
  attendance: {
    status: 'present' | 'absent';
    checkedBy: string;
    note?: string;
  }
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, makeupId);
    
    const makeup = await getMakeupClass(makeupId);
    if (!makeup) {
      throw new Error('Makeup class not found');
    }
    
    if (makeup.status !== 'completed') {
      throw new Error('Can only update attendance for completed makeup classes');
    }
    
    await updateDoc(docRef, {
      attendance: {
        ...attendance,
        note: attendance.note || null,
        checkedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating makeup attendance:', error);
    throw error;
  }
}

// Revert makeup to scheduled status
export async function revertMakeupToScheduled(
  makeupId: string,
  revertedBy: string,
  reason: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, makeupId);
    
    const makeup = await getMakeupClass(makeupId);
    if (!makeup) {
      throw new Error('Makeup class not found');
    }
    
    if (makeup.status !== 'completed') {
      throw new Error('Can only revert completed makeup classes');
    }
    
    const batch = writeBatch(db);
    
    batch.update(docRef, {
      status: 'scheduled',
      attendance: null,
      updatedAt: serverTimestamp(),
      notes: `${makeup.notes || ''}\n[${new Date().toLocaleDateString('th-TH')}] ยกเลิกการบันทึกเข้าเรียน: ${reason} (โดย ${revertedBy})`
    });
    
    const logRef = doc(collection(db, 'auditLogs'));
    batch.set(logRef, {
      type: 'makeup_attendance_reverted',
      documentId: makeupId,
      performedBy: revertedBy,
      performedAt: serverTimestamp(),
      reason,
      previousData: {
        status: makeup.status,
        attendance: makeup.attendance
      }
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error reverting makeup status:', error);
    throw error;
  }
}

// Delete makeup class
export async function deleteMakeupClass(
  makeupId: string,
  deletedBy: string,
  reason?: string
): Promise<void> {
  try {
    const makeup = await getMakeupClass(makeupId);
    if (!makeup) {
      throw new Error('Makeup class not found');
    }

    if (makeup.status === 'completed') {
      throw new Error('Cannot delete completed makeup class');
    }

    const batch = writeBatch(db);

    const makeupRef = doc(db, COLLECTION_NAME, makeupId);
    batch.delete(makeupRef);

    if (makeup.originalScheduleId && makeup.originalClassId) {
      const scheduleData = await getClassSchedule(makeup.originalClassId, makeup.originalScheduleId);
      if (scheduleData && scheduleData.attendance) {
        const updatedAttendance = scheduleData.attendance.filter(
          a => a.studentId !== makeup.studentId
        );
        
        const scheduleRef = doc(db, 'classes', makeup.originalClassId, 'schedules', makeup.originalScheduleId);
        batch.update(scheduleRef, {
          attendance: updatedAttendance
        });
      }
    }

    const logRef = doc(collection(db, 'deletionLogs'));
    batch.set(logRef, {
      type: 'makeup_class',
      documentId: makeupId,
      deletedBy,
      deletedAt: serverTimestamp(),
      reason: reason || 'No reason provided',
      originalData: {
        studentId: makeup.studentId,
        studentName: makeup.studentName,
        classId: makeup.originalClassId,
        className: makeup.className,
        scheduleId: makeup.originalScheduleId,
        status: makeup.status,
        requestDate: makeup.requestDate
      }
    });

    await batch.commit();
  } catch (error) {
    console.error('Error deleting makeup class:', error);
    throw error;
  }
}

// Check teacher availability
export async function checkTeacherAvailability(
  teacherId: string,
  date: Date,
  startTime: string,
  endTime: string,
  branchId: string,
  roomId: string,
  excludeMakeupId?: string
): Promise<{ available: boolean; reason?: string }> {
  try {
    const { checkAvailability } = await import('../utils/availability');
    
    const result = await checkAvailability({
      date,
      startTime,
      endTime,
      branchId,
      roomId,
      teacherId,
      excludeId: excludeMakeupId,
      excludeType: 'makeup'
    });
    
    if (!result.available) {
      const firstIssue = result.reasons[0];
      return {
        available: false,
        reason: firstIssue.message
      };
    }
    
    return { available: true };
  } catch (error) {
    console.error('Error checking teacher availability:', error);
    return { available: false, reason: 'เกิดข้อผิดพลาดในการตรวจสอบ' };
  }
}

// Get makeup class by original schedule
export async function getMakeupByOriginalSchedule(
  studentId: string,
  classId: string,
  scheduleId: string
): Promise<MakeupClass | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentId),
      where('originalClassId', '==', classId),
      where('originalScheduleId', '==', scheduleId),
      where('status', 'in', ['pending', 'scheduled'])
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.size > 0) {
      const docData = querySnapshot.docs[0];
      const data = docData.data() as any;
      return {
        id: docData.id,
        type: data.type,
        originalClassId: data.originalClassId,
        originalScheduleId: data.originalScheduleId,
        originalSessionNumber: data.originalSessionNumber,
        originalSessionDate: data.originalSessionDate?.toDate(),
        
        className: data.className || '',
        classCode: data.classCode || '',
        subjectId: data.subjectId || '',
        subjectName: data.subjectName || '',
        
        studentId: data.studentId,
        studentName: data.studentName || '',
        studentNickname: data.studentNickname || '',
        
        parentId: data.parentId,
        parentName: data.parentName || '',
        parentPhone: data.parentPhone || '',
        parentLineUserId: data.parentLineUserId,
        
        branchId: data.branchId || '',
        branchName: data.branchName || '',
        
        requestDate: data.requestDate?.toDate() || new Date(),
        requestedBy: data.requestedBy,
        reason: data.reason,
        status: data.status,
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        makeupSchedule: data.makeupSchedule ? {
          date: data.makeupSchedule.date?.toDate() || new Date(),
          startTime: data.makeupSchedule.startTime,
          endTime: data.makeupSchedule.endTime,
          teacherId: data.makeupSchedule.teacherId,
          teacherName: data.makeupSchedule.teacherName,
          branchId: data.makeupSchedule.branchId,
          roomId: data.makeupSchedule.roomId,
          roomName: data.makeupSchedule.roomName,
          confirmedAt: data.makeupSchedule.confirmedAt?.toDate(),
          confirmedBy: data.makeupSchedule.confirmedBy,
        } : undefined,
        attendance: data.attendance ? {
          status: data.attendance.status,
          checkedBy: data.attendance.checkedBy,
          checkedAt: data.attendance.checkedAt?.toDate() || new Date(),
          note: data.attendance.note,
        } : undefined,
      } as MakeupClass;
    }
    return null;
  } catch (error) {
    console.error('Error getting makeup by original schedule:', error);
    return null;
  }
}

// Delete makeup class for schedule
export async function deleteMakeupForSchedule(
  studentId: string,
  classId: string,
  scheduleId: string,
  deletedBy: string,
  reason: string = 'Attendance updated to present'
): Promise<void> {
  try {
    const makeup = await getMakeupByOriginalSchedule(studentId, classId, scheduleId);
    if (!makeup) return;

    if (makeup.status === 'completed') {
      await cancelMakeupClass(makeup.id, reason, deletedBy);
    } else {
      await deleteMakeupClass(makeup.id, deletedBy, reason);
    }
  } catch (error) {
    console.error('Error deleting makeup for schedule:', error);
    throw error;
  }
}