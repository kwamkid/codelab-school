import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Class, ClassSchedule, Subject, Teacher, Room } from '@/types/models';

/**
 * Interface สำหรับข้อมูลสถิติบน Dashboard
 */
export interface DashboardStats {
  totalBranches: number;
  totalStudents: number;
  activeClasses: number;
  monthlyRevenue: number;
}

/**
 * ดึงข้อมูลสถิติหลักสำหรับหน้า Dashboard
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // 1. Get total branches
    const branchesSnapshot = await getDocs(collection(db, 'branches'));
    const totalBranches = branchesSnapshot.size;

    // 2. Get total students (นับเฉพาะนักเรียนที่ Active)
    // หมายเหตุ: วิธีนี้อาจช้าลงถ้ามีผู้ปกครองเยอะมาก ในระบบจริงอาจต้องใช้ counter แยก
    const parentsSnapshot = await getDocs(collection(db, 'parents'));
    let totalStudents = 0;
    for (const parentDoc of parentsSnapshot.docs) {
      const studentsQuery = query(
        collection(db, 'parents', parentDoc.id, 'students'),
        where('isActive', '==', true)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      totalStudents += studentsSnapshot.size;
    }

    // 3. Get active classes (ที่เปิดรับสมัคร หรือกำลังเรียน)
    const classesQuery = query(collection(db, 'classes'), where('status', 'in', ['published', 'started']));
    const activeClassesSnapshot = await getDocs(classesQuery);
    const activeClasses = activeClassesSnapshot.size;

    // 4. Get monthly revenue (ส่วนนี้ต้องมีการ query ที่ซับซ้อนมากขึ้น)
    // ในตัวอย่างนี้จะขอใส่เป็นค่าว่างไว้ก่อน
    const monthlyRevenue = 0;

    return {
      totalBranches,
      totalStudents,
      activeClasses,
      monthlyRevenue,
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    return {
      totalBranches: 0,
      totalStudents: 0,
      activeClasses: 0,
      monthlyRevenue: 0,
    };
  }
}


/**
 * Interface สำหรับ Event ที่จะแสดงบนปฏิทิน
 */
export interface CalendarEvent {
  id: string; // scheduleId
  classId: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    roomName: string;
    teacherName: string;
    enrolled: number;
    maxStudents: number;
  };
}

/**
 * ดึงข้อมูลคลาสทั้งหมดเพื่อมาแสดงผลในปฏิทินตามช่วงวันที่
 * @param viewStart วันที่เริ่มต้นของมุมมองปฏิทิน
 * @param viewEnd วันที่สิ้นสุดของมุมมองปฏิทิน
 * @returns Array ของ CalendarEvent
 */
export async function getCalendarEvents(viewStart: Date, viewEnd: Date): Promise<CalendarEvent[]> {
  try {
    // 1. ดึงข้อมูลพื้นฐานทั้งหมดที่ต้องใช้ในการ lookup มาก่อนเพื่อประสิทธิภาพ
    const [subjectsSnap, teachersSnap] = await Promise.all([
      getDocs(collection(db, 'subjects')),
      getDocs(collection(db, 'teachers')),
    ]);

    // 2. แปลงข้อมูลเป็น Map เพื่อให้ค้นหาได้รวดเร็ว (key คือ ID)
    const subjectMap = new Map(subjectsSnap.docs.map(doc => [doc.id, doc.data() as Subject]));
    const teacherMap = new Map(teachersSnap.docs.map(doc => [doc.id, doc.data() as Teacher]));

    const events: CalendarEvent[] = [];
    const classesRef = collection(db, 'classes');
    
    // 3. ดึงคลาสที่ยัง Active และอยู่ในช่วงเวลาที่แสดงบนปฏิทิน
    const q = query(
      classesRef,
      where('status', 'in', ['published', 'started']),
      where('startDate', '<=', Timestamp.fromDate(viewEnd)),
    );

    const classSnap = await getDocs(q);

    for (const classDoc of classSnap.docs) {
      const classData = { id: classDoc.id, ...classDoc.data() } as Class;

      // กรองคลาสที่จบไปแล้วก่อนช่วงเวลาที่แสดงผลออก
      if (new Date(classData.endDate) < viewStart) {
        continue;
      }
      
      const schedulesRef = collection(db, 'classes', classDoc.id, 'schedules');
      const scheduleQuery = query(
        schedulesRef,
        where('sessionDate', '>=', Timestamp.fromDate(viewStart)),
        where('sessionDate', '<=', Timestamp.fromDate(viewEnd))
      );
      
      const scheduleSnap = await getDocs(scheduleQuery);

      if (scheduleSnap.empty) continue;

      // 4. ใช้ข้อมูลจาก Map ที่เตรียมไว้
      const subject = subjectMap.get(classData.subjectId);
      const teacher = teacherMap.get(classData.teacherId);
      
      // ดึงข้อมูลห้อง
      const roomDoc = await getDoc(doc(db, 'branches', classData.branchId, 'rooms', classData.roomId));
      const room = roomDoc.exists() ? roomDoc.data() as Room : null;
      
      for (const scheduleDoc of scheduleSnap.docs) {
        const scheduleData = scheduleDoc.data() as ClassSchedule;

        if (!classData.startTime || !classData.endTime) continue;

        const sessionDate = (scheduleData.sessionDate as Timestamp).toDate();
        const [startHour, startMinute] = classData.startTime.split(':').map(Number);
        const [endHour, endMinute] = classData.endTime.split(':').map(Number);

        const startDateTime = new Date(sessionDate);
        startDateTime.setHours(startHour, startMinute, 0, 0);

        const endDateTime = new Date(sessionDate);
        endDateTime.setHours(endHour, endMinute, 0, 0);
        
        // 5. เพิ่ม event เข้าไปใน list
        events.push({
          id: scheduleDoc.id,
          classId: classData.id,
          title: `(${classData.enrolledCount}/${classData.maxStudents}) ${classData.name}`,
          start: startDateTime,
          end: endDateTime,
          backgroundColor: subject?.color || '#3788d8',
          borderColor: subject?.color || '#3788d8',
          extendedProps: {
            roomName: room?.name || 'N/A',
            teacherName: teacher?.nickname || teacher?.name || 'N/A',
            enrolled: classData.enrolledCount,
            maxStudents: classData.maxStudents,
          }
        });
      }
    }
    return events;
  } catch (error) {
    console.error("Error getting calendar events:", error);
    return [];
  }
}