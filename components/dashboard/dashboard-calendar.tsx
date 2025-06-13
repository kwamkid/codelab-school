'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarEvent } from '@/lib/services/dashboard';

interface DashboardCalendarProps {
  events: CalendarEvent[];
  onEventClick: (info: any) => void;
  onDatesSet: (dateInfo: any) => void;
  loading?: boolean;
}

export default function DashboardCalendar({ 
  events, 
  onEventClick, 
  onDatesSet,
  loading = false 
}: DashboardCalendarProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow relative">
      {loading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">กำลังโหลดตารางเรียน...</p>
          </div>
        </div>
      )}
      
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={events}
        height="auto"
        locale="en"
        firstDay={0}
        buttonText={{
          today: 'วันนี้',
          month: 'เดือน',
          week: 'สัปดาห์',
          day: 'วัน'
        }}
        allDaySlot={false}
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        eventClick={onEventClick}
        datesSet={onDatesSet}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }}
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }}
        eventContent={(eventInfo) => {
          const { extendedProps } = eventInfo.event;
          return (
            <div className="p-1 text-xs overflow-hidden">
              <div className="font-semibold truncate">{eventInfo.event.title}</div>
              <div className="truncate opacity-90">
                {extendedProps.roomName} • {extendedProps.teacherName}
              </div>
              {extendedProps.branchName !== 'N/A' && (
                <div className="truncate opacity-75">
                  สาขา: {extendedProps.branchName}
                </div>
              )}
            </div>
          );
        }}
        dayMaxEvents={3}
        moreLinkText="ดูเพิ่มเติม"
        noEventsText="ไม่มีคลาสในช่วงเวลานี้"
        views={{
          timeGridWeek: {
            titleFormat: { day: 'numeric', month: 'short', year: 'numeric' }
          },
          timeGridDay: {
            titleFormat: { day: 'numeric', month: 'long', year: 'numeric' }
          }
        }}
      />
    </div>
  );
}