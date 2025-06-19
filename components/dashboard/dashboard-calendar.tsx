// components/dashboard/dashboard-calendar.tsx

'use client';

import { useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarEvent } from '@/lib/services/dashboard';
import { DatesSetArg, EventClickArg, EventContentArg } from '@fullcalendar/core';
import { Clock, Users, MapPin, User, Calendar } from 'lucide-react';

interface DashboardCalendarProps {
  events: CalendarEvent[];
  onDatesSet: (dateInfo: DatesSetArg) => void;
  onEventClick: (clickInfo: EventClickArg) => void;
  showHalfHour: boolean;
  setShowHalfHour: (value: boolean) => void;
}

export default function DashboardCalendar({ 
  events, 
  onDatesSet,
  onEventClick,
  showHalfHour,
  setShowHalfHour
}: DashboardCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);

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
    const isTrial = props.type === 'trial';
    const isHoliday = props.type === 'holiday';
    const isMonthView = eventInfo.view.type === 'dayGridMonth';
    const isDayView = eventInfo.view.type === 'timeGridDay';
    const isWeekView = eventInfo.view.type === 'timeGridWeek';
    
    // Don't render holiday content in list/time views (they're background events)
    if (isHoliday && !isMonthView) {
      return null;
    }
    
    // For holidays in month view
    if (isHoliday && isMonthView) {
      return (
        <div className="px-1 py-0.5 text-xs text-red-700 font-medium">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{eventInfo.event.title}</span>
          </div>
        </div>
      );
    }
    
    // For list view
    if (isListView) {
      return (
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1">
            <div className="font-medium text-sm flex items-center gap-2">
              {/* Subject color dot */}
              {props.subjectColor && (
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: props.subjectColor }}
                />
              )}
              {isMakeup && <span className="text-purple-600">[Makeup] </span>}
              {isTrial && <span className="text-orange-600">[ทดลอง] </span>}
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
              {!isMakeup && !isTrial && props.enrolled !== undefined && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {props.enrolled}/{props.maxStudents}
                </span>
              )}
            </div>
          </div>
          {props.sessionNumber && !isMakeup && !isTrial && (
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
        <div className="px-1 py-0.5 text-xs flex items-center gap-1">
          {/* Subject color dot */}
          {props.subjectColor && (
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0" 
              style={{ backgroundColor: props.subjectColor }}
            />
          )}
          <div className="font-medium truncate flex-1">
            {eventInfo.timeText.split(' - ')[0]} {/* Start time only */}
            {' '}
            {isMakeup ? (
              <span>[M] {props.studentNickname}</span>
            ) : isTrial ? (
              <span>[T] {props.trialStudentName}</span>
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
              <div className="font-semibold text-sm flex items-center gap-1.5 mb-1">
                {props.subjectColor && (
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: props.subjectColor }}
                  />
                )}
                <span className="text-purple-800">[Makeup] {props.studentNickname}</span>
              </div>
              <div className="text-xs text-purple-700">
                {props.originalClassName}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {props.teacherName}
              </div>
            </div>
          ) : isTrial ? (
            // Trial class display
            <div>
              <div className="font-semibold text-sm flex items-center gap-1.5 mb-1">
                {props.subjectColor && (
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: props.subjectColor }}
                  />
                )}
                <span className="text-orange-800">[ทดลอง] {props.trialStudentName}</span>
              </div>
              <div className="text-xs text-orange-700">
                {props.trialSubjectName}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                {props.teacherName}
              </div>
            </div>
          ) : (
            // Regular class display
            <div>
              <div className="text-xs text-gray-600 font-medium">
                {eventInfo.timeText}
              </div>
              <div className="font-semibold text-sm flex items-center gap-1.5 mt-0.5">
                {props.subjectColor && (
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: props.subjectColor }}
                  />
                )}
                <span className="text-gray-800">
                  {subjectName}
                  {props.sessionNumber && (
                    <span className="ml-1 font-normal">ครั้งที่ {props.sessionNumber}</span>
                  )}
                </span>
              </div>
              {classCode && (
                <div className="text-xs text-gray-600 mt-0.5">
                  {classCode}
                </div>
              )}
              <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {props.roomName}
              </div>
              {props.enrolled !== undefined && (
                <div className="text-xs text-gray-700 mt-1 flex items-center gap-1">
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
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        }}
        events={events.map(event => ({
          ...event,
          // Add text color from the event
          textColor: event.textColor,
          // Add tooltip content
          title: event.extendedProps.type === 'makeup' 
            ? `[Makeup] ${event.extendedProps.studentNickname} - ${event.extendedProps.originalClassName}`
            : event.extendedProps.type === 'trial'
            ? `[ทดลอง] ${event.extendedProps.trialStudentName} - ${event.extendedProps.trialSubjectName}`
            : event.extendedProps.type === 'holiday'
            ? `วันหยุด: ${event.title}`
            : event.title,
          // Add extended props for tooltip
          extendedProps: {
            ...event.extendedProps,
            tooltip: event.extendedProps.type === 'holiday' ? {
              type: 'holiday',
              name: event.title,
              holidayType: event.extendedProps.holidayType
            } : {
              time: `${new Date(event.start as Date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.end as Date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
              room: event.extendedProps.roomName,
              teacher: event.extendedProps.teacherName,
              branch: event.extendedProps.branchName,
              enrolled: event.extendedProps.enrolled,
              maxStudents: event.extendedProps.maxStudents
            }
          }
        }))}
        eventDidMount={(info) => {
          const props = info.event.extendedProps;
          
          // Skip holidays from click handlers (they're background events)
          if (props.type === 'holiday') {
            info.el.style.pointerEvents = 'none';
            info.el.style.cursor = 'default';
            return;
          }
          
          // Add class based on event type and status for styling
          const eventDate = info.event.end as Date;
          const now = new Date();
          
          // Add class for status
          if (props.status === 'completed' || props.isFullyAttended) {
            info.el.classList.add('status-completed');
          } else if (props.status === 'past_incomplete') {
            info.el.classList.add('status-past-incomplete');
          }
          
          // Add tooltip to events
          let tooltipContent = '';
          
          if (props.type === 'makeup') {
            tooltipContent = `
              <div class="text-xs">
                <div class="font-semibold">[Makeup] ${props.studentNickname}</div>
                <div>คลาสเดิม: ${props.originalClassName}</div>
                <div>เวลา: ${props.tooltip.time}</div>
                <div>ห้อง: ${props.tooltip.room}</div>
                <div>ครู: ${props.tooltip.teacher}</div>
                <div>สาขา: ${props.tooltip.branch}</div>
              </div>
            `;
          } else if (props.type === 'trial') {
            tooltipContent = `
              <div class="text-xs">
                <div class="font-semibold">[ทดลอง] ${props.trialStudentName}</div>
                <div>วิชา: ${props.trialSubjectName}</div>
                <div>เวลา: ${props.tooltip.time}</div>
                <div>ห้อง: ${props.tooltip.room}</div>
                <div>ครู: ${props.tooltip.teacher}</div>
                <div>สาขา: ${props.tooltip.branch}</div>
              </div>
            `;
          } else {
            const statusText = props.isFullyAttended ? ' (เช็คชื่อครบ)' : 
                             props.status === 'past_incomplete' ? ' (ยังไม่เช็คชื่อ)' : '';
            tooltipContent = `
              <div class="text-xs">
                <div class="font-semibold">${info.event.title}${statusText}</div>
                ${props.sessionNumber ? `<div>ครั้งที่ ${props.sessionNumber}</div>` : ''}
                <div>เวลา: ${props.tooltip.time}</div>
                <div>ห้อง: ${props.tooltip.room}</div>
                <div>ครู: ${props.tooltip.teacher}</div>
                <div>สาขา: ${props.tooltip.branch}</div>
                ${props.enrolled !== undefined ? `<div>นักเรียน: ${props.enrolled}/${props.maxStudents}</div>` : ''}
              </div>
            `;
          }
          
          // Set tooltip
          info.el.setAttribute('title', '');
          info.el.setAttribute('data-tooltip', tooltipContent);
          
          // Simple hover tooltip
          info.el.addEventListener('mouseenter', function(e) {
            const tooltip = document.createElement('div');
            tooltip.innerHTML = tooltipContent;
            tooltip.className = 'fc-tooltip';
            tooltip.style.position = 'absolute';
            tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
            tooltip.style.color = 'white';
            tooltip.style.padding = '8px 12px';
            tooltip.style.borderRadius = '6px';
            tooltip.style.fontSize = '12px';
            tooltip.style.zIndex = '9999';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.whiteSpace = 'nowrap';
            tooltip.style.lineHeight = '1.4';
            
            document.body.appendChild(tooltip);
            
            const rect = info.el.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            // Position tooltip above the event
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltipRect.width / 2) + 'px';
            tooltip.style.top = rect.top - tooltipRect.height - 5 + 'px';
            
            // Store tooltip reference
            info.el._tooltip = tooltip;
          });
          
          info.el.addEventListener('mouseleave', function(e) {
            if (info.el._tooltip) {
              info.el._tooltip.remove();
              delete info.el._tooltip;
            }
          });
        }}
        eventClick={(clickInfo) => {
          // Prevent clicking on holidays
          if (clickInfo.event.extendedProps.type === 'holiday') {
            return;
          }
          onEventClick(clickInfo);
        }}
        datesSet={onDatesSet}
        locale="th"
        firstDay={0}
        height="auto"
        contentHeight="auto"
        aspectRatio={1.8}
        dayMaxEvents={false}
        slotMinTime="08:00:00"
        slotMaxTime="19:00:00"
        slotDuration="01:00:00"
        slotLabelInterval="01:00:00"
        eventMinHeight={50}
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          meridiem: false,
          omitZeroMinute: false,
          ...(showHalfHour && {
            minute: undefined,
          })
        }}
        slotLabelContent={(arg) => {
          if (showHalfHour) {
            const hour = arg.date.getHours();
            return `${hour.toString().padStart(2, '0')}:30`;
          }
          const hour = arg.date.getHours();
          return `${hour.toString().padStart(2, '0')}:00`;
        }}
        expandRows={true}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }}
        eventContent={renderEventContent}
        eventClassNames={(arg) => {
          const type = arg.event.extendedProps.type;
          return type ? `${type}-event` : '';
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
          border-width: 1px;
          border-style: solid;
        }
        
        .dashboard-calendar .fc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          filter: brightness(0.95);
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
        
        /* Time grid slot height */
        .dashboard-calendar .fc-timegrid-slot {
          height: 60px !important;
        }
        
        .dashboard-calendar .fc-timegrid-slot-lane {
          border-bottom: 1px solid #E5E7EB;
        }
        
        .dashboard-calendar .fc-timegrid-slot-minor {
          border-top-style: dotted;
        }
        
        /* Regular class styles - Gray background (default) */
        .dashboard-calendar .class-event {
          background-color: #E5E7EB !important;
          border-color: #D1D5DB !important;
          color: #374151 !important;
        }
        
        .dashboard-calendar .class-event:hover {
          background-color: #D1D5DB !important;
        }
        
        /* Completed class styles - Green (fully attended) */
        .dashboard-calendar .class-event.status-completed {
          background-color: #D1FAE5 !important;
          border-color: #A7F3D0 !important;
          color: #065F46 !important;
        }
        
        .dashboard-calendar .class-event.status-completed * {
          color: #065F46 !important;
        }
        
        /* Past incomplete class styles - Amber (time passed but not fully attended) */
        .dashboard-calendar .class-event.status-past-incomplete {
          background-color: #FEF3C7 !important;
          border-color: #FDE68A !important;
          color: #92400E !important;
        }
        
        .dashboard-calendar .class-event.status-past-incomplete * {
          color: #92400E !important;
        }
        
        /* Makeup event styles - Purple */
        .dashboard-calendar .makeup-event {
          background-color: #E9D5FF !important;
          border-color: #D8B4FE !important;
          color: #6B21A8 !important;
        }
        
        .dashboard-calendar .makeup-event:hover {
          background-color: #D8B4FE !important;
        }
        
        /* Completed makeup */
        .dashboard-calendar .makeup-event.completed-makeup-event {
          background-color: #D1FAE5 !important;
          border-color: #A7F3D0 !important;
          color: #065F46 !important;
        }
        
        /* Trial event styles - Orange */
        .dashboard-calendar .trial-event {
          background-color: #FED7AA !important;
          border-color: #FDBA74 !important;
          color: #9A3412 !important;
        }
        
        .dashboard-calendar .trial-event:hover {
          background-color: #FDBA74 !important;
        }
        
        /* Completed trial */
        .dashboard-calendar .trial-event.completed-trial-event {
          background-color: #D1FAE5 !important;
          border-color: #A7F3D0 !important;
          color: #065F46 !important;
        }
        
        /* Holiday event styles - Red background */
        .dashboard-calendar .holiday-event {
          background-color: #FEE2E2 !important;
          border: none !important;
          opacity: 0.8;
          pointer-events: none !important;
          cursor: default !important;
        }
        
        /* Holiday text in month view */
        .dashboard-calendar .fc-daygrid-day.fc-day-has-events .holiday-event {
          margin-bottom: 2px;
        }
        
        /* Ensure calendar takes full height without scroll */
        .dashboard-calendar .fc-view-harness {
          min-height: 600px;
        }
        
        .dashboard-calendar .fc-scroller {
          overflow: visible !important;
          height: auto !important;
        }
        
        .dashboard-calendar .fc-daygrid-body {
          width: 100% !important;
        }
        
        .dashboard-calendar .fc-scrollgrid-sync-table {
          height: 100% !important;
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
        
        /* Legend */
        .dashboard-calendar-legend {
          display: flex;
          gap: 1rem;
          padding: 0.75rem;
          background-color: #F9FAFB;
          border-radius: 0.5rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }
        
        .dashboard-calendar-legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #4B5563;
        }
        
        .dashboard-calendar-legend-dot {
          width: 1rem;
          height: 1rem;
          border-radius: 0.25rem;
          border: 1px solid;
        }
        
        /* Tooltip styles */
        .fc-tooltip {
          max-width: 250px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .fc-tooltip > div > div {
          margin: 2px 0;
        }
        
        .fc-tooltip .font-semibold {
          font-weight: 600;
          margin-bottom: 4px;
          padding-bottom: 4px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        
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
      
      {/* Legend */}
      <div className="dashboard-calendar-legend">
        <div className="dashboard-calendar-legend-item">
          <div 
            className="dashboard-calendar-legend-dot" 
            style={{ backgroundColor: '#E5E7EB', borderColor: '#D1D5DB' }}
          />
          <span>คลาสปกติ</span>
        </div>
        <div className="dashboard-calendar-legend-item">
          <div 
            className="dashboard-calendar-legend-dot" 
            style={{ backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' }}
          />
          <span>เช็คชื่อครบ/จบแล้ว</span>
        </div>
        <div className="dashboard-calendar-legend-item">
          <div 
            className="dashboard-calendar-legend-dot" 
            style={{ backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }}
          />
          <span>เลยเวลา (ยังไม่เช็คชื่อ)</span>
        </div>
        <div className="dashboard-calendar-legend-item">
          <div 
            className="dashboard-calendar-legend-dot" 
            style={{ backgroundColor: '#E9D5FF', borderColor: '#D8B4FE' }}
          />
          <span>Makeup Class</span>
        </div>
        <div className="dashboard-calendar-legend-item">
          <div 
            className="dashboard-calendar-legend-dot" 
            style={{ backgroundColor: '#FED7AA', borderColor: '#FDBA74' }}
          />
          <span>ทดลองเรียน</span>
        </div>
        <div className="dashboard-calendar-legend-item">
          <div 
            className="dashboard-calendar-legend-dot" 
            style={{ backgroundColor: '#FEE2E2', borderColor: '#FECACA' }}
          />
          <span>วันหยุด</span>
        </div>
      </div>
    </div>
  );
}