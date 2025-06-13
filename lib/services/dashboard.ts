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

    // 4. Get monthly revenue
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
  id: string;
  classId: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    branchId: string;
    branchName: string;
    roomName: string;
    teacherName: string;
    enrolled: number;
    maxStudents: number;
    sessionNumber: number;
    status: string;
  };
}

/**
 * ดึงข้อมูลคลาสทั้งหมดเพื่อมาแสดงผลในปฏิทินตามช่วงวันที่และสาขา
 * @param viewStart วันที่เริ่มต้นของมุมมองปฏิทิน
 * @param viewEnd วันที่สิ้นสุดของมุมมองปฏิทิน
 * @param branchId ID ของสาขาที่ต้องการดู (ถ้าเป็น 'all' จะแสดงทุกสาขา)
 * @returns Array ของ CalendarEvent
 */
export async function getCalendarEvents(
  viewStart: Date, 
  viewEnd: Date,
  branchId?: string
): Promise<CalendarEvent[]> {
  try {
    // 1. ดึงข้อมูลพื้นฐานทั้งหมดที่ต้องใช้
    const [subjectsSnap, teachersSnap, branchesSnap] = await Promise.all([
      getDocs(collection(db, 'subjects')),
      getDocs(collection(db, 'teachers')),
      getDocs(collection(db, 'branches'))
    ]);

    // 2. แปลงข้อมูลเป็น Map
    const subjectMap = new Map(subjectsSnap.docs.map(doc => [doc.id, doc.data() as Subject]));
    const teacherMap = new Map(teachersSnap.docs.map(doc => [doc.id, doc.data() as Teacher]));
    const branchMap = new Map(branchesSnap.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));

    const events: CalendarEvent[] = [];
    const classesRef = collection(db, 'classes');
    
    // 3. สร้าง query ตามเงื่อนไข
    let q;
    if (branchId && branchId !== 'all') {
      // Filter by specific branch
      q = query(
        classesRef,
        where('status', 'in', ['published', 'started']),
        where('branchId', '==', branchId),
        where('startDate', '<=', Timestamp.fromDate(viewEnd))
      );
    } else {
      // Show all branches
      q = query(
        classesRef,
        where('status', 'in', ['published', 'started']),
        where('startDate', '<=', Timestamp.fromDate(viewEnd))
      );
    }

    const classSnap = await getDocs(q);

    // 4. Process each class
    for (const classDoc of classSnap.docs) {
      const classData = { 
        id: classDoc.id, 
        ...classDoc.data(),
        startDate: classDoc.data().startDate?.toDate() || new Date(),
        endDate: classDoc.data().endDate?.toDate() || new Date(),
      } as Class;

      // Skip if class ended before view start
      if (classData.endDate < viewStart) {
        continue;
      }
      
      console.log('Processing class:', classData.name, classData.id);
      
      // Get schedules for this class
      const schedulesRef = collection(db, 'classes', classDoc.id, 'schedules');
      const scheduleQuery = query(
        schedulesRef,
        where('sessionDate', '>=', Timestamp.fromDate(viewStart)),
        where('sessionDate', '<=', Timestamp.fromDate(viewEnd)),
        where('status', 'in', ['scheduled', 'rescheduled'])
      );
      
      const scheduleSnap = await getDocs(scheduleQuery);

      if (scheduleSnap.empty) continue;

      // Get related data
      const subject = subjectMap.get(classData.subjectId);
      const teacher = teacherMap.get(classData.teacherId);
      const branch = branchMap.get(classData.branchId);
      
      // Get room data
      let room: Room | null = null;
      try {
        const roomDoc = await getDoc(doc(db, 'branches', classData.branchId, 'rooms', classData.roomId));
        if (roomDoc.exists()) {
          room = { id: roomDoc.id, branchId: classData.branchId, ...roomDoc.data() } as Room;
        }
      } catch (error) {
        console.error('Error fetching room:', error);
      }
      
      // Create events for each schedule
      for (const scheduleDoc of scheduleSnap.docs) {
        const scheduleData = { 
          id: scheduleDoc.id, 
          ...scheduleDoc.data(),
          sessionDate: scheduleDoc.data().sessionDate?.toDate() || new Date()
        } as ClassSchedule;

        if (!classData.startTime || !classData.endTime) continue;

        const sessionDate = scheduleData.sessionDate;
        const [startHour, startMinute] = classData.startTime.split(':').map(Number);
        const [endHour, endMinute] = classData.endTime.split(':').map(Number);

        const startDateTime = new Date(sessionDate);
        startDateTime.setHours(startHour, startMinute, 0, 0);

        const endDateTime = new Date(sessionDate);
        endDateTime.setHours(endHour, endMinute, 0, 0);
        
        // Create calendar event
        events.push({
          id: `${classData.id}-${scheduleDoc.id}`,
          classId: classData.id,
          title: `${classData.name} (${classData.enrolledCount}/${classData.maxStudents})`,
          start: startDateTime,
          end: endDateTime,
          backgroundColor: subject?.color || '#3788d8',
          borderColor: subject?.color || '#3788d8',
          extendedProps: {
            branchId: classData.branchId,
            branchName: branch?.name || 'N/A',
            roomName: room?.name || 'N/A',
            teacherName: teacher?.nickname || teacher?.name || 'N/A',
            enrolled: classData.enrolledCount,
            maxStudents: classData.maxStudents,
            sessionNumber: scheduleData.sessionNumber,
            status: scheduleData.status
          }
        });
      }
    }
    
    // Sort events by start time
    events.sort((a, b) => a.start.getTime() - b.start.getTime());
    
    return events;
  } catch (error) {
    console.error("Error getting calendar events:", error);
    return [];
  }
}