'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import DashboardCalendar from '@/components/dashboard/dashboard-calendar';
import { getCalendarEvents, CalendarEvent } from '@/lib/services/dashboard';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// สร้าง Dialog แสดงรายละเอียดคลาส (จะทำในขั้นตอนถัดไป)
// import ClassDetailDialog from '@/components/dashboard/class-detail-dialog';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  // State สำหรับ Dialog
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedEventInfo, setSelectedEventInfo] = useState<any>(null);

  const handleDatesSet = useCallback(async (dateInfo: any) => {
    setLoading(true);
    try {
      const fetchedEvents = await getCalendarEvents(dateInfo.start, dateInfo.end);
      setEvents(fetchedEvents);
    } catch (error) {
      toast.error('ไม่สามารถโหลดข้อมูลตารางเรียนได้');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const handleEventClick = (clickInfo: any) => {
    // TODO: เปิด Dialog แสดงรายละเอียดนักเรียนในคลาส
    toast.info(`คลิกที่คลาส: ${clickInfo.event.title}`, {
      description: `Class ID: ${clickInfo.event.extendedProps.classId}`,
    });
    // setSelectedEventInfo(clickInfo.event);
    // setIsDetailOpen(true);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">ตารางเรียน</h1>
        <p className="text-gray-600 mt-2">ภาพรวมตารางเรียนทั้งหมด</p>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
        </div>
      )}
      
      <DashboardCalendar 
        events={events} 
        onDatesSet={handleDatesSet}
        onEventClick={handleEventClick}
      />
      
      {/* <ClassDetailDialog
          isOpen={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          eventInfo={selectedEventInfo}
        /> 
      */}
    </div>
  );
}