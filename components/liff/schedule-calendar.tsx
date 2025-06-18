'use client';

import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { DatesSetArg, EventClickArg, EventContentArg } from '@fullcalendar/core';
import { Clock, Users, MapPin, User, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export interface ScheduleEvent {
  id: string;
  classId: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    type: 'class' | 'makeup' | 'trial';
    studentId: string;
    studentName: string;
    studentNickname?: string;
    branchName: string;
    roomName: string;
    teacherName: string;
    subjectName: string;
    subjectColor?: string;
    sessionNumber?: number;
    status?: string;
    // For makeup
    originalClassName?: string;
    makeupStatus?: string;
  };
}

interface ScheduleCalendarProps {
  events: ScheduleEvent[];
  onDatesSet: (dateInfo: DatesSetArg) => void;
  loading?: boolean;
  selectedStudentId?: string;
}

export default function ScheduleCalendar({ 
  events, 
  onDatesSet,
  loading = false,
  selectedStudentId
}: ScheduleCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    // Set calendar to today when component mounts
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.today();
    }
  }, []);

  // Filter events by selected student
  const filteredEvents = selectedStudentId 
    ? events.filter(event => event.extendedProps.studentId === selectedStudentId)
    : events;

  // Handle event click
  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = filteredEvents.find(e => e.id === clickInfo.event.id);
    if (event) {
      setSelectedEvent(event);
      setDialogOpen(true);
    }
  };

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
            <div className="font-medium text-sm flex items-center gap-2">
              {props.subjectColor && (
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: props.subjectColor }}
                />
              )}
              {isMakeup && <span className="text-purple-600">[Makeup] </span>}
              <span>{props.studentNickname || props.studentName}</span>
              <span className="text-gray-500">- {props.subjectName}</span>
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
    
    // For month view
    if (isMonthView) {
      return (
        <div className="px-1 py-0.5 text-xs flex items-center gap-1">
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
              <span>[M] {props.studentNickname || props.studentName}</span>
            ) : (
              <span>{props.studentNickname || props.studentName}</span>
            )}
          </div>
        </div>
      );
    }
    
    // For day/week view
    if (isDayView || isWeekView) {
      return (
        <div className="p-2 h-full overflow-hidden">
          {isMakeup ? (
            <div>
              <div className="font-semibold text-sm flex items-center gap-1.5 mb-1">
                {props.subjectColor && (
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: props.subjectColor }}
                  />
                )}
                <span className="text-purple-800">[Makeup]</span>
              </div>
              <div className="text-xs text-purple-700">
                {props.studentNickname || props.studentName}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {props.originalClassName}
              </div>
            </div>
          ) : (
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
                  {props.studentNickname || props.studentName}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {props.subjectName}
                {props.sessionNumber && (
                  <span className="ml-1">ครั้งที่ {props.sessionNumber}</span>
                )}
              </div>
              <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {props.roomName}
              </div>
            </div>
          )}
        </div>
      );
    }
    
    return <div className="p-1 text-xs">{eventInfo.event.title}</div>;
  };

  return (
    <>
      <div className="liff-schedule-calendar">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
          }}
          events={filteredEvents.map(event => ({
            ...event,
            title: event.extendedProps.type === 'makeup' 
              ? `[Makeup] ${event.extendedProps.studentNickname || event.extendedProps.studentName} - ${event.extendedProps.originalClassName}`
              : `${event.extendedProps.studentNickname || event.extendedProps.studentName} - ${event.extendedProps.subjectName}`,
          }))}
          eventDidMount={(info) => {
            const props = info.event.extendedProps;
            const eventDate = info.event.end as Date;
            const now = new Date();
            
            // Add class for completed events
            if (props.type === 'class' && eventDate < now) {
              info.el.classList.add('completed-event');
            } else if (props.type === 'makeup' && eventDate < now) {
              info.el.classList.add('completed-makeup-event');
            }
            
            if (props.status === 'completed') {
              info.el.classList.add('status-completed');
            }
          }}
          eventClick={handleEventClick}
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
          expandRows={true}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          eventContent={renderEventContent}
          eventClassNames={(arg) => {
            const type = arg.event.extendedProps.type;
            return `${type}-event`;
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
          /* Calendar styles similar to dashboard */
          .liff-schedule-calendar .fc {
            font-family: inherit;
          }
          
          .liff-schedule-calendar .fc-event {
            cursor: pointer;
            border: none;
            transition: all 0.2s ease;
            border-radius: 6px;
            overflow: hidden;
            border-width: 1px;
            border-style: solid;
          }
          
          .liff-schedule-calendar .fc-event:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
            filter: brightness(0.95);
          }
          
          /* Regular class styles */
          .liff-schedule-calendar .class-event {
            background-color: #E5E7EB !important;
            border-color: #D1D5DB !important;
            color: #374151 !important;
          }
          
          /* Completed class styles */
          .liff-schedule-calendar .class-event.completed-event,
          .liff-schedule-calendar .class-event.status-completed {
            background-color: #D1FAE5 !important;
            border-color: #A7F3D0 !important;
            color: #065F46 !important;
          }
          
          /* Makeup event styles */
          .liff-schedule-calendar .makeup-event {
            background-color: #E9D5FF !important;
            border-color: #D8B4FE !important;
            color: #6B21A8 !important;
          }
          
          /* Completed makeup */
          .liff-schedule-calendar .makeup-event.completed-makeup-event {
            background-color: #D1FAE5 !important;
            border-color: #A7F3D0 !important;
            color: #065F46 !important;
          }
          
          /* Mobile responsive */
          @media (max-width: 640px) {
            .liff-schedule-calendar .fc-toolbar {
              flex-direction: column;
              gap: 0.5rem;
            }
            
            .liff-schedule-calendar .fc-toolbar-title {
              font-size: 1.25rem;
            }
            
            .liff-schedule-calendar .fc-button {
              padding: 0.25rem 0.5rem;
              font-size: 0.875rem;
            }
          }
        `}</style>
        
        {/* Legend */}
        <div className="flex gap-4 mt-4 p-3 bg-gray-50 rounded-lg flex-wrap text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-200 border border-gray-300" />
            <span>คลาสปกติ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-100 border border-purple-200" />
            <span>Makeup Class</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-200" />
            <span>เรียนเสร็จแล้ว</span>
          </div>
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              รายละเอียดคลาสเรียน
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              {/* Student Info */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">
                    {selectedEvent.extendedProps.studentNickname || selectedEvent.extendedProps.studentName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.extendedProps.studentName}
                  </p>
                </div>
              </div>

              {/* Class Type Badge */}
              <div>
                {selectedEvent.extendedProps.type === 'makeup' ? (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    Makeup Class
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    คลาสปกติ
                  </Badge>
                )}
              </div>

              {/* Class Details */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">วิชา</p>
                  <p className="font-medium flex items-center gap-2">
                    {selectedEvent.extendedProps.subjectColor && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: selectedEvent.extendedProps.subjectColor }}
                      />
                    )}
                    {selectedEvent.extendedProps.type === 'makeup' 
                      ? selectedEvent.extendedProps.originalClassName 
                      : selectedEvent.extendedProps.subjectName}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">วันที่และเวลา</p>
                  <p className="font-medium">
                    {format(selectedEvent.start, 'EEEE d MMMM yyyy', { locale: th })}
                  </p>
                  <p className="text-sm">
                    {format(selectedEvent.start, 'HH:mm')} - {format(selectedEvent.end, 'HH:mm')} น.
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">สถานที่</p>
                  <p className="font-medium">{selectedEvent.extendedProps.branchName}</p>
                  <p className="text-sm">ห้อง {selectedEvent.extendedProps.roomName}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">ครูผู้สอน</p>
                  <p className="font-medium">ครู{selectedEvent.extendedProps.teacherName}</p>
                </div>

                {selectedEvent.extendedProps.sessionNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">คาบเรียน</p>
                    <p className="font-medium">ครั้งที่ {selectedEvent.extendedProps.sessionNumber}</p>
                  </div>
                )}
              </div>

              {/* Status */}
              {selectedEvent.extendedProps.status === 'completed' && (
                <div className="pt-3 border-t">
                  <Badge className="w-full justify-center" variant="default">
                    เรียนเสร็จแล้ว
                  </Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}