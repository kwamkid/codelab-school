import { 
  collection, 
  getDocs, 
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Class, ClassSchedule, Holiday } from '@/types/models';
import { getClasses } from './classes';
import { getClassSchedules, updateClassSchedule } from './classes';

// ตรวจสอบคลาสที่ได้รับผลกระทบจากวันหยุด
export async function getAffectedClasses(
  holiday: Holiday
): Promise<{ class: Class; schedules: ClassSchedule[] }[]> {
  try {
    const affectedClasses: { class: Class; schedules: ClassSchedule[] }[] = [];
    
    // ดึงคลาสทั้งหมดที่ active
    const classes = await getClasses();
    const activeClasses = classes.filter(c => 
      ['published', 'started'].includes(c.status)
    );
    
    for (const cls of activeClasses) {
      // ตรวจสอบว่าเป็นวันหยุดที่กระทบคลาสนี้หรือไม่
      const isAffected = holiday.type === 'national' || 
        (holiday.branches?.includes(cls.branchId));
      
      if (!isAffected) continue;
      
      // ตรวจสอบว่าวันหยุดตรงกับวันเรียนของคลาสหรือไม่
      const holidayDayOfWeek = holiday.date.getDay();
      if (!cls.daysOfWeek.includes(holidayDayOfWeek)) continue;
      
      // ตรวจสอบว่าวันหยุดอยู่ในช่วงของคลาสหรือไม่
      if (holiday.date < cls.startDate || holiday.date > cls.endDate) continue;
      
      // ดึงตารางเรียนของคลาสที่ตรงกับวันหยุด
      const schedules = await getClassSchedules(cls.id);
      const affectedSchedules = schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.sessionDate);
        return scheduleDate.toDateString() === holiday.date.toDateString() &&
               schedule.status === 'scheduled';
      });
      
      if (affectedSchedules.length > 0) {
        affectedClasses.push({ class: cls, schedules: affectedSchedules });
      }
    }
    
    return affectedClasses;
  } catch (error) {
    console.error('Error getting affected classes:', error);
    throw error;
  }
}

// Reschedule คลาสที่ได้รับผลกระทบจากวันหยุด
export async function rescheduleClassesForHoliday(
  holiday: Holiday,
  userId: string
): Promise<number> {
  try {
    const affectedClasses = await getAffectedClasses(holiday);
    let totalRescheduled = 0;
    
    for (const { class: cls, schedules } of affectedClasses) {
      for (const schedule of schedules) {
        // หาวันใหม่สำหรับคลาสนี้
        const newDate = await findNextAvailableDate(
          cls,
          schedule.sessionDate,
          cls.endDate
        );
        
        if (newDate) {
          // อัพเดตตารางเรียน
          await updateClassSchedule(cls.id, schedule.id, {
            sessionDate: newDate,
            status: 'rescheduled',
            originalDate: schedule.sessionDate,
            rescheduledAt: new Date(),
            rescheduledBy: userId,
            note: `เลื่อนเนื่องจากวันหยุด: ${holiday.name}`
          });
          
          totalRescheduled++;
        }
      }
    }
    
    return totalRescheduled;
  } catch (error) {
    console.error('Error rescheduling classes:', error);
    throw error;
  }
}

// หาวันที่ว่างถัดไปสำหรับคลาส
async function findNextAvailableDate(
  cls: Class,
  fromDate: Date,
  maxDate: Date
): Promise<Date | null> {
  try {
    const currentDate = new Date(fromDate);
    currentDate.setDate(currentDate.getDate() + 1);
    
    // หาวันที่ตรงกับวันเรียนของคลาส
    while (currentDate <= maxDate) {
      const dayOfWeek = currentDate.getDay();
      
      if (cls.daysOfWeek.includes(dayOfWeek)) {
        // ตรวจสอบว่าไม่ใช่วันหยุด
        const isHolidayDate = await checkIfHoliday(
          currentDate,
          cls.branchId
        );
        
        if (!isHolidayDate) {
          // ตรวจสอบว่าไม่มีคลาสอื่นในวันนี้แล้ว
          const schedules = await getClassSchedules(cls.id);
          const hasSchedule = schedules.some(s => 
            new Date(s.sessionDate).toDateString() === currentDate.toDateString()
          );
          
          if (!hasSchedule) {
            return currentDate;
          }
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // ถ้าไม่พบวันว่างในช่วงคลาส ให้ต่อท้ายคลาส
    return extendClassEndDate(cls);
    
  } catch (error) {
    console.error('Error finding next available date:', error);
    return null;
  }
}

// ตรวจสอบว่าเป็นวันหยุดหรือไม่
async function checkIfHoliday(
  date: Date,
  branchId: string
): Promise<boolean> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Query วันหยุดทั้งหมดในวันนั้น
    const q = query(
      collection(db, 'holidays'),
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay))
    );
    
    const snapshot = await getDocs(q);
    
    // ตรวจสอบว่ามีวันหยุดที่กระทบ branch นี้หรือไม่
    for (const doc of snapshot.docs) {
      const holiday = doc.data() as Holiday;
      if (holiday.type === 'national' || 
          holiday.branches?.includes(branchId)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking holiday:', error);
    return false;
  }
}

// ขยายวันสิ้นสุดคลาส
async function extendClassEndDate(
  cls: Class
): Promise<Date | null> {
  try {
    const newEndDate = new Date(cls.endDate);
    let attempts = 0;
    const maxAttempts = 30; // พยายามหาไม่เกิน 30 วัน
    
    while (attempts < maxAttempts) {
      newEndDate.setDate(newEndDate.getDate() + 1);
      const dayOfWeek = newEndDate.getDay();
      
      if (cls.daysOfWeek.includes(dayOfWeek)) {
        const isHolidayDate = await checkIfHoliday(
          newEndDate,
          cls.branchId
        );
        
        if (!isHolidayDate) {
          // อัพเดตวันสิ้นสุดคลาส
          await updateClass(cls.id, { endDate: newEndDate });
          return newEndDate;
        }
      }
      
      attempts++;
    }
    
    return null;
  } catch (error) {
    console.error('Error extending class end date:', error);
    return null;
  }
}

// ฟังก์ชันสำหรับอัพเดตคลาส (import จาก classes.ts)
import { updateClass } from './classes';

// ดึงประวัติการ reschedule ของคลาส
export async function getRescheduleHistory(
  classId: string
): Promise<ClassSchedule[]> {
  try {
    const schedules = await getClassSchedules(classId);
    return schedules.filter(s => 
      s.status === 'rescheduled' && s.originalDate
    );
  } catch (error) {
    console.error('Error getting reschedule history:', error);
    return [];
  }
}

// ดึงคลาสที่มีตารางเรียนตรงกับวันหยุด (ไม่ว่าจะเคย reschedule หรือไม่)
export async function getClassesOnHoliday(
  holiday: Holiday
): Promise<{ className: string; sessionDate: Date }[]> {
  try {
    const result: { className: string; sessionDate: Date }[] = [];
    
    // ดึงคลาสทั้งหมดที่ active
    const classes = await getClasses();
    const activeClasses = classes.filter(c => 
      ['published', 'started'].includes(c.status)
    );
    
    for (const cls of activeClasses) {
      // ตรวจสอบว่าเป็นวันหยุดที่กระทบคลาสนี้หรือไม่
      const isAffected = holiday.type === 'national' || 
        (holiday.branches?.includes(cls.branchId));
      
      if (!isAffected) continue;
      
      // ตรวจสอบว่าวันหยุดตรงกับวันเรียนของคลาสหรือไม่
      const holidayDayOfWeek = holiday.date.getDay();
      if (!cls.daysOfWeek.includes(holidayDayOfWeek)) continue;
      
      // ตรวจสอบว่าวันหยุดอยู่ในช่วงของคลาสหรือไม่
      if (holiday.date < cls.startDate || holiday.date > cls.endDate) continue;
      
      // ถ้าผ่านเงื่อนไขทั้งหมด แสดงว่ามีคลาสที่ควรจะเรียนในวันนี้
      result.push({
        className: cls.name,
        sessionDate: holiday.date
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error getting classes on holiday:', error);
    return [];
  }
}

// Reschedule คลาสทั้งหมดสำหรับวันหยุดที่ถูกลบ
export async function rescheduleClassesForDeletedHoliday(
  holiday: Holiday
): Promise<number> {
  try {
    let totalScheduled = 0;
    
    // ดึงคลาสทั้งหมดที่ active
    const classes = await getClasses();
    const activeClasses = classes.filter(c => 
      ['published', 'started'].includes(c.status)
    );
    
    for (const cls of activeClasses) {
      // ตรวจสอบว่าเป็นวันหยุดที่กระทบคลาสนี้หรือไม่
      const isAffected = holiday.type === 'national' || 
        (holiday.branches?.includes(cls.branchId));
      
      if (!isAffected) continue;
      
      // ตรวจสอบว่าวันหยุดตรงกับวันเรียนของคลาสหรือไม่
      const holidayDayOfWeek = holiday.date.getDay();
      if (!cls.daysOfWeek.includes(holidayDayOfWeek)) continue;
      
      // ตรวจสอบว่าวันหยุดอยู่ในช่วงของคลาสหรือไม่
      if (holiday.date < cls.startDate || holiday.date > cls.endDate) continue;
      
      // ตรวจสอบว่ามี schedule ในวันนี้หรือไม่
      const schedules = await getClassSchedules(cls.id);
      const hasScheduleOnDate = schedules.some(s => 
        new Date(s.sessionDate).toDateString() === holiday.date.toDateString()
      );
      
      // ถ้าไม่มี schedule ในวันนี้ (เพราะเคยหลบวันหยุด) ให้สร้างใหม่
      if (!hasScheduleOnDate) {
        // หา session number ที่ถูกต้อง
        const sessionsBefore = schedules.filter(s => 
          new Date(s.sessionDate) < holiday.date
        ).length;
        const sessionNumber = sessionsBefore + 1;
        
        // สร้าง schedule ใหม่
        const { addDoc } = await import('firebase/firestore');
        const schedulesRef = collection(db, 'classes', cls.id, 'schedules');
        
        await addDoc(schedulesRef, {
          classId: cls.id,
          sessionDate: Timestamp.fromDate(holiday.date),
          sessionNumber: sessionNumber,
          status: 'scheduled',
          note: `เพิ่มคืนหลังจากลบวันหยุด: ${holiday.name}`
        });
        
        totalScheduled++;
      }
    }
    
    return totalScheduled;
  } catch (error) {
    console.error('Error rescheduling classes for deleted holiday:', error);
    throw error;
  }
}

// Reschedule ทุกคลาสที่ขาดหายไป
export async function rescheduleAllMissingClasses(): Promise<{ addedCount: number; details: string[] }> {
  try {
    let totalAdded = 0;
    const details: string[] = [];
    
    // ดึงคลาสทั้งหมดที่ active
    const classes = await getClasses();
    const activeClasses = classes.filter(c => 
      ['published', 'started'].includes(c.status)
    );
    
    for (const cls of activeClasses) {
      const schedules = await getClassSchedules(cls.id);
      const scheduledDates = new Set(
        schedules.map(s => new Date(s.sessionDate).toDateString())
      );
      
      // วนหาวันที่ควรมีคลาสแต่ไม่มี
      const currentDate = new Date(cls.startDate);
      const endDate = new Date(cls.endDate);
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        // ถ้าเป็นวันที่ควรมีคลาส
        if (cls.daysOfWeek.includes(dayOfWeek)) {
          // ตรวจสอบว่าไม่มี schedule ในวันนี้
          if (!scheduledDates.has(currentDate.toDateString())) {
            // ตรวจสอบว่าไม่ใช่วันหยุดปัจจุบัน
            const isHoliday = await checkIfHoliday(currentDate, cls.branchId);
            
            if (!isHoliday) {
              // หา session number ที่ถูกต้อง
              const sessionsBefore = schedules.filter(s => 
                new Date(s.sessionDate) < currentDate
              ).length;
              const sessionNumber = sessionsBefore + 1;
              
              // สร้าง schedule ใหม่
              const { addDoc } = await import('firebase/firestore');
              const schedulesRef = collection(db, 'classes', cls.id, 'schedules');
              
              await addDoc(schedulesRef, {
                classId: cls.id,
                sessionDate: Timestamp.fromDate(new Date(currentDate)),
                sessionNumber: sessionNumber,
                status: 'scheduled',
                note: 'เพิ่มจากการจัดตารางใหม่ทั้งหมด'
              });
              
              totalAdded++;
              details.push(`${cls.name} - ${formatDate(currentDate, 'long')}`);
            }
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    return { addedCount: totalAdded, details };
  } catch (error) {
    console.error('Error rescheduling all missing classes:', error);
    throw error;
  }
}

// Reschedule ทุกคลาสให้ตรงกับจำนวนครั้งที่กำหนด
export async function rescheduleAllClasses(): Promise<{ 
  processedCount: number; 
  details: { className: string; action: string }[] 
}> {
  try {
    let processedCount = 0;
    const details: { className: string; action: string }[] = [];
    
    // ดึงคลาสทั้งหมดที่ active
    const classes = await getClasses();
    const activeClasses = classes.filter(c => 
      ['published', 'started'].includes(c.status)
    );
    
    console.log(`Found ${activeClasses.length} active classes to reschedule`);
    
    for (const cls of activeClasses) {
      console.log(`Processing class: ${cls.name}`);
      
      // ลบ schedules เดิมทั้งหมด
      const schedulesRef = collection(db, 'classes', cls.id, 'schedules');
      const existingSchedules = await getDocs(schedulesRef);
      
      // ลบทั้งหมด
      const { deleteDoc } = await import('firebase/firestore');
      for (const doc of existingSchedules.docs) {
        await deleteDoc(doc.ref);
      }
      
      console.log(`Deleted ${existingSchedules.size} existing schedules`);
      
      // สร้าง schedules ใหม่
      const newSchedules = await generateScheduleDates(
        cls.startDate,
        cls.daysOfWeek,
        cls.totalSessions,
        cls.branchId
      );
      
      console.log(`Generated ${newSchedules.length} new schedules`);
      
      // สร้าง schedule documents
      const { addDoc } = await import('firebase/firestore');
      for (let i = 0; i < newSchedules.length; i++) {
        await addDoc(schedulesRef, {
          classId: cls.id,
          sessionDate: Timestamp.fromDate(newSchedules[i]),
          sessionNumber: i + 1,
          status: 'scheduled',
          note: 'สร้างจากการ reschedule ทั้งหมด'
        });
      }
      
      // อัพเดต endDate ให้ตรงกับวันสุดท้าย
      if (newSchedules.length > 0) {
        const newEndDate = newSchedules[newSchedules.length - 1];
        await updateClass(cls.id, { endDate: newEndDate });
      }
      
      processedCount++;
      details.push({
        className: cls.name,
        action: `จัดตารางใหม่ ${newSchedules.length} ครั้ง (ตามที่กำหนด: ${cls.totalSessions} ครั้ง)`
      });
    }
    
    return { processedCount, details };
  } catch (error) {
    console.error('Error rescheduling all classes:', error);
    throw error;
  }
}

// Generate schedule dates helper (คัดลอกจาก classes.ts)
async function generateScheduleDates(
  startDate: Date,
  daysOfWeek: number[],
  totalSessions: number,
  branchId: string
): Promise<Date[]> {
  const schedules: Date[] = [];
  const currentDate = new Date(startDate.getTime());
  
  // Get all holidays for the branch
  const maxEndDate = new Date(startDate);
  maxEndDate.setFullYear(maxEndDate.getFullYear() + 1); // ดูล่วงหน้า 1 ปี
  
  const { getHolidaysForBranch } = await import('./holidays');
  const holidays = await getHolidaysForBranch(branchId, startDate, maxEndDate);
  
  // Create a Set of holiday dates for faster lookup
  const holidayDates = new Set(
    holidays.map(h => h.date.toDateString())
  );
  
  while (schedules.length < totalSessions) {
    const dayOfWeek = currentDate.getDay();
    
    // Check if it's a scheduled day and not a holiday
    if (daysOfWeek.includes(dayOfWeek) && !holidayDates.has(currentDate.toDateString())) {
      schedules.push(new Date(currentDate));
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
}
// Helper function สำหรับ format date
function formatDate(date: Date, format: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: format === 'long' ? 'long' : 'short',
    year: 'numeric',
    weekday: format === 'long' ? 'long' : undefined
  }).format(date);
}