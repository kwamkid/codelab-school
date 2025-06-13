import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Class, ClassSchedule } from '@/types/models';

// ... (โค้ด getDashboardStats ยังคงอยู่เหมือนเดิม) ...

export interface CalendarEvent {
  id: string;
  classId: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    roomName: string;
    teacherName: string;
  };
}

// ฟังก์ชันใหม่สำหรับดึงข้อมูลคลาสมาแสดงในปฏิทิน
export async function getCalendarEvents(viewStart: Date, viewEnd: Date): Promise<CalendarEvent[]> {
  try {
    const classesRef = collection(db, 'classes');
    // ดึงคลาสที่ยังไม่จบและอยู่ในช่วงเวลาที่แสดงผล
    const q = query(
      classesRef,
      where('status', 'in', ['published', 'started']),
      where('startDate', '<=', Timestamp.fromDate(viewEnd)),
      where('endDate', '>=', Timestamp.fromDate(viewStart))
    );

    const classSnap = await getDocs(q);
    const events: CalendarEvent[] = [];

    for (const classDoc of classSnap.docs) {
      const classData = { id: classDoc.id, ...classDoc.data() } as Class;
      
      const schedulesRef = collection(db, 'classes', classDoc.id, 'schedules');
      const scheduleQuery = query(
        schedulesRef,
        where('sessionDate', '>=', Timestamp.fromDate(viewStart)),
        where('sessionDate', '<=', Timestamp.fromDate(viewEnd))
      );
      
      const scheduleSnap = await getDocs(scheduleQuery);
      
      // ดึงข้อมูลวิชา (สำหรับสี) - ควรจะ cache ไว้ในอนาคตเพื่อประสิทธิภาพ
      const subjectDoc = await getDocs(query(collection(db, 'subjects'), where('__name__', '==', classData.subjectId)));
      const subjectColor = subjectDoc.docs[0]?.data().color || '#3788d8';
      
      for (const scheduleDoc of scheduleSnap.docs) {
        const scheduleData = scheduleDoc.data() as ClassSchedule;

        const sessionDate = (scheduleData.sessionDate as Timestamp).toDate();
        const [startHour, startMinute] = classData.startTime.split(':').map(Number);
        const [endHour, endMinute] = classData.endTime.split(':').map(Number);

        const startDateTime = new Date(sessionDate);
        startDateTime.setHours(startHour, startMinute, 0, 0);

        const endDateTime = new Date(sessionDate);
        endDateTime.setHours(endHour, endMinute, 0, 0);

        events.push({
          id: scheduleDoc.id,
          classId: classData.id,
          title: classData.name,
          start: startDateTime,
          end: endDateTime,
          backgroundColor: subjectColor,
          borderColor: subjectColor,
          extendedProps: {
            roomName: '', // ต้องดึงข้อมูลห้องมาเพิ่ม
            teacherName: '', // ต้องดึงข้อมูลครูมาเพิ่ม
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