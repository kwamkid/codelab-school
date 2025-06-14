'use client';

import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarEvent } from '@/lib/services/dashboard';
import { DatesSetArg, EventClickArg, EventContentArg } from '@fullcalendar/core';
import { Clock, Users, MapPin, User } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface DashboardCalendarProps {
  events: CalendarEvent[];
  onDatesSet: (dateInfo: DatesSetArg) => void;
  onEventClick: (clickInfo: EventClickArg) => void;
}

export default function DashboardCalendar({ 
  events, 
  onDatesSet,
  onEventClick 
}: DashboardCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [showHalfHour, setShowHalfHour] = useState(false);

  useEffect(() => {
    // Set calendar to today when component mounts
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.today();
    }
  }, []);

  // Custom event content renderer
  const renderEventContent = (eventInfo: EventContentArg) => {
    const props = eventInfo.event.extendedProps;
    const isListView = eventInfo.view.type.includes('list');
    const isMakeup = props.type === 'makeup';
    const isMonthView = eventInfo.view.type === 'dayGridMonth';
    const isDayView = eventInfo.view.type === 'timeGridDay';
    const isWeekView = eventInfo.view.type === 'timeGridWeek';
    
    // For list view
    if (isListView) {
      return (
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1">
            <div className="font-medium text-sm">
              {isMakeup && <span className="text-purple-600">[Makeup] </span>}
              {eventInfo.event.title}
            </div>
            <div className="text-xs text-gray-600 flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {eventInfo.timeText}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {props.roomName}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {props.teacherName}
              </span>
              {!isMakeup && props.enrolled !== undefined && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {props.enrolled}/{props.maxStudents}
                </span>
              )}
            </div>
          </div>
          {props.sessionNumber && !isMakeup && (
            <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
              ครั้งที่ {props.sessionNumber}
            </div>
          )}
        </div>
      );
    }
    
    // For month view - compact display
    if (isMonthView) {
      return (
        <div className="px-1 py-0.5 text-xs">
          <div className="font-medium truncate">
            {eventInfo.timeText.split(' - ')[0]} {/* Start time only */}
            {' '}
            {isMakeup ? (
              <span className="text-purple-100">{props.studentNickname}</span>
            ) : (
              <span>{eventInfo.event.title.split(' - ')[0]}</span>
            )}
          </div>
        </div>
      );
    }
    
    // For day/week view - detailed display
    if (isDayView || isWeekView) {
      const [subjectName, classCode] = eventInfo.event.title.split(' - ');
      
      return (
        <div className="p-2 h-full overflow-hidden">
          {isMakeup ? (
            // Makeup class display
            <div>
              <div className="font-semibold text-sm text-white mb-1">
                [Makeup] {props.studentNickname}
              </div>
              <div className="text-xs text-purple-100">
                {props.originalClassName}
              </div>
              <div className="text-xs text-purple-200 mt-1">
                {props.teacherName}
              </div>
            </div>
          ) : (
            // Regular class display
            <div>
              <div className="text-xs text-white/80 font-medium">
                {eventInfo.timeText}
              </div>
              <div className="font-semibold text-sm text-white mt-0.5">
                {subjectName}
                {props.sessionNumber && (
                  <span className="ml-1 font-normal">ครั้งที่ {props.sessionNumber}</span>
                )}
              </div>
              {classCode && (
                <div className="text-xs text-white/70 mt-0.5">
                  {classCode}
                </div>
              )}
              {props.enrolled !== undefined && (
                <div className="text-xs text-white/90 mt-1 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {props.enrolled}/{props.maxStudents}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    // Default (shouldn't reach here)
    return <div className="p-1 text-xs">{eventInfo.event.title}</div>;
  };

  return (
    <div className="dashboard-calendar">
      {/* Time slot display toggle */}
      <div className="flex items-center gap-2 mb-4 justify-end">
        <Label htmlFor="half-hour" className="text-sm text-gray-600">
          แสดงช่วงเวลา 30 นาที
        </Label>
        <Switch
          id="half-hour"
          checked={showHalfHour}
          onCheckedChange={setShowHalfHour}
        />
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        }}
        events={events}
        eventClick={onEventClick}
        datesSet={onDatesSet}
        locale="th"
        firstDay={0}
        height="auto"
        dayMaxEvents={3}
        slotMinTime="08:00:00"
        slotMaxTime="19:00:00"
        slotDuration={showHalfHour ? "00:30:00" : "01:00:00"}
        slotLabelInterval={showHalfHour ? "00:30:00" : "01:00:00"}
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
        eventContent={renderEventContent}
        eventClassNames={(arg) => {
          const isMakeup = arg.event.extendedProps.type === 'makeup';
          return isMakeup ? 'makeup-event' : 'class-event';
        }}
        moreLinkContent={(args) => {
          return `อีก ${args.num} รายการ`;
        }}
        buttonText={{
          today: 'วันนี้',
          month: 'เดือน',
          week: 'สัปดาห์',
          day: 'วัน',
          list: 'รายการ'
        }}
        allDayText="ทั้งวัน"
        noEventsText="ไม่มีคลาสเรียน"
        expandRows={true}
        nowIndicator={true}
        navLinks={true}
      />
      
      <style jsx global>{`
        /* General calendar styles */
        .dashboard-calendar .fc {
          font-family: inherit;
        }
        
        .dashboard-calendar .fc-event {
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          border-radius: 6px;
          overflow: hidden;
        }
        
        .dashboard-calendar .fc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          filter: brightness(1.1);
        }
        
        /* Month view styles */
        .dashboard-calendar .fc-daygrid-event {
          white-space: normal;
          align-items: flex-start;
          font-size: 0.75rem;
          padding: 2px 4px;
          min-height: 20px;
        }
        
        .dashboard-calendar .fc-daygrid-day-events {
          margin-top: 2px;
        }
        
        .dashboard-calendar .fc-daygrid-event-harness {
          margin-bottom: 2px;
        }
        
        /* Week/Day view styles */
        .dashboard-calendar .fc-timegrid-event {
          border-radius: 6px;
          padding: 2px;
          overflow: hidden;
        }
        
        .dashboard-calendar .fc-timegrid-event-harness {
          margin-right: 2px;
        }
        
        /* Makeup event styles */
        .dashboard-calendar .makeup-event {
          background-color: #8B5CF6 !important;
          border-color: #8B5CF6 !important;
        }
        
        .dashboard-calendar .makeup-event:hover {
          background-color: #7C3AED !important;
        }
        
        /* Completed class styles */
        .dashboard-calendar .fc-event[style*="rgb(16, 185, 129)"] {
          opacity: 0.85;
        }
        
        /* Time slot styles */
        .dashboard-calendar .fc-timegrid-slot-label {
          font-size: 0.75rem;
          color: #6B7280;
        }
        
        .dashboard-calendar .fc-timegrid-axis {
          padding-right: 8px;
        }
        
        /* Now indicator */
        .dashboard-calendar .fc-timegrid-now-indicator-line {
          border-color: #EF4444;
          border-width: 2px;
        }
        
        .dashboard-calendar .fc-timegrid-now-indicator-arrow {
          border-color: #EF4444;
        }
        
        /* Custom more link styling */
        .dashboard-calendar .fc-more-link {
          color: #EF4444;
          font-weight: 500;
          font-size: 0.75rem;
        }
        
        .dashboard-calendar .fc-more-link:hover {
          text-decoration: underline;
        }
        
        /* Today highlight */
        .dashboard-calendar .fc-day-today {
          background-color: #FEF2F2 !important;
        }
        
        /* Toolbar styles */
        .dashboard-calendar .fc-toolbar {
          margin-bottom: 1.5rem;
        }
        
        .dashboard-calendar .fc-toolbar-title {
          font-size: 1.5rem;
          font-weight: 600;
        }
        
        .dashboard-calendar .fc-button {
          background-color: white;
          color: #374151;
          border: 1px solid #E5E7EB;
          font-weight: 500;
          padding: 0.375rem 0.75rem;
          transition: all 0.15s ease;
        }
        
        .dashboard-calendar .fc-button:hover {
          background-color: #F3F4F6;
          border-color: #D1D5DB;
        }
        
        .dashboard-calendar .fc-button-active {
          background-color: #EF4444 !important;
          color: white !important;
          border-color: #EF4444 !important;
        }
        
        .dashboard-calendar .fc-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Nav links */
        .dashboard-calendar .fc-daygrid-day-number {
          color: #374151;
          font-weight: 500;
          text-decoration: none;
          padding: 4px;
        }
        
        .dashboard-calendar .fc-daygrid-day-number:hover {
          color: #EF4444;
          text-decoration: none;
        }
        
        /* Mobile responsive */
        @media (max-width: 640px) {
          .dashboard-calendar .fc-toolbar {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .dashboard-calendar .fc-toolbar-title {
            font-size: 1.25rem;
          }
          
          .dashboard-calendar .fc-button {
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
          }
          
          .dashboard-calendar .fc-daygrid-event {
            font-size: 0.7rem;
          }
          
          .dashboard-calendar .fc-timegrid-event {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  );
}