'use client';

import { useState, useCallback, useEffect } from 'react';
import DashboardCalendar from '@/components/dashboard/dashboard-calendar';
import ClassDetailDialog from '@/components/dashboard/class-detail-dialog';
import { getCalendarEvents, CalendarEvent } from '@/lib/services/dashboard';
import { getActiveBranches } from '@/lib/services/branches';
import { Branch } from '@/types/models';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DatesSetArg, EventClickArg } from '@fullcalendar/core';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [showHalfHour, setShowHalfHour] = useState(false);
  
  // Filter states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  
  // Load branches on mount
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const branchesData = await getActiveBranches();
        setBranches(branchesData);
      } catch (error) {
        console.error('Error loading branches:', error);
      }
    };
    
    loadBranches();
  }, []);
  
  const handleDatesSet = useCallback(async (dateInfo: DatesSetArg) => {
    setLoading(true);
    setDateRange({ start: dateInfo.start, end: dateInfo.end });
    
    try {
      const branchIdToQuery = selectedBranch === 'all' ? undefined : selectedBranch;
      const fetchedEvents = await getCalendarEvents(dateInfo.start, dateInfo.end, branchIdToQuery);
      setAllEvents(fetchedEvents);
      setEvents(fetchedEvents);
    } catch (error) {
      toast.error('ไม่สามารถโหลดข้อมูลตารางเรียนได้');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);
  
  // Re-apply filters when branch changes
  const handleBranchChange = async (value: string) => {
    setSelectedBranch(value);
    
    // Re-fetch events with new branch filter
    if (dateRange) {
      setLoading(true);
      try {
        const branchIdToQuery = value === 'all' ? undefined : value;
        const fetchedEvents = await getCalendarEvents(dateRange.start, dateRange.end, branchIdToQuery);
        setAllEvents(fetchedEvents);
        setEvents(fetchedEvents);
      } catch (error) {
        toast.error('ไม่สามารถโหลดข้อมูลตารางเรียนได้');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleEventClick = (clickInfo: EventClickArg) => {
    console.log('Event clicked:', clickInfo.event);
    
    // Extract schedule ID from event ID (format: classId-scheduleId)
    const eventId = clickInfo.event.id;
    const scheduleId = eventId.includes('-') ? eventId.split('-')[1] : '';
    
    // Get the class ID from extendedProps
    const classId = clickInfo.event.extendedProps.classId || clickInfo.event.id.split('-')[0];
    
    const event: CalendarEvent = {
      id: eventId,
      classId: classId,
      title: clickInfo.event.title,
      start: clickInfo.event.start!,
      end: clickInfo.event.end!,
      backgroundColor: clickInfo.event.backgroundColor,
      borderColor: clickInfo.event.borderColor,
      extendedProps: {
        branchId: clickInfo.event.extendedProps.branchId,
        branchName: clickInfo.event.extendedProps.branchName,
        roomName: clickInfo.event.extendedProps.roomName,
        teacherName: clickInfo.event.extendedProps.teacherName,
        enrolled: clickInfo.event.extendedProps.enrolled,
        maxStudents: clickInfo.event.extendedProps.maxStudents,
        sessionNumber: clickInfo.event.extendedProps.sessionNumber,
        status: clickInfo.event.extendedProps.status,
        type: clickInfo.event.extendedProps.type,
        studentName: clickInfo.event.extendedProps.studentName,
        studentNickname: clickInfo.event.extendedProps.studentNickname,
        originalClassName: clickInfo.event.extendedProps.originalClassName,
        makeupStatus: clickInfo.event.extendedProps.makeupStatus
      }
    };
    
    console.log('Setting event:', event);
    setSelectedEvent(event);
    setSelectedScheduleId(scheduleId);
    setDialogOpen(true);
  };

  // Refresh calendar after saving attendance
  const handleDialogClose = async (open: boolean) => {
    if (!open) {
      setDialogOpen(false);
    }
  };
  
  const handleAttendanceSaved = async () => {
    setDialogOpen(false);
    
    // Reload events to reflect the updated status
    if (dateRange) {
      setLoading(true);
      try {
        const branchIdToQuery = selectedBranch === 'all' ? undefined : selectedBranch;
        const fetchedEvents = await getCalendarEvents(dateRange.start, dateRange.end, branchIdToQuery);
        setAllEvents(fetchedEvents);
        setEvents(fetchedEvents);
        toast.success('บันทึกการเช็คชื่อเรียบร้อยแล้ว');
      } catch (error) {
        console.error('Error reloading events:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">ภาพรวมตารางเรียนและข้อมูลสำคัญ</p>
        </div>
        
        {/* Branch Filter */}
        <Select value={selectedBranch} onValueChange={handleBranchChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="เลือกสาขา" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสาขา</SelectItem>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>ตารางเรียนทั้งหมด</CardTitle>
            {/* Time slot display toggle */}
            <div className="flex items-center gap-2">
              <Label htmlFor="half-hour" className="text-sm text-gray-600 cursor-pointer">
                แสดงช่วงเวลา 30 นาที
              </Label>
              <Switch
                id="half-hour"
                checked={showHalfHour}
                onCheckedChange={setShowHalfHour}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
            </div>
          )}
          
          <DashboardCalendar 
            events={events} 
            onDatesSet={handleDatesSet}
            onEventClick={handleEventClick}
            showHalfHour={showHalfHour}
            setShowHalfHour={setShowHalfHour}
          />
        </CardContent>
      </Card>

      {/* Class Detail Dialog */}
      <ClassDetailDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        event={selectedEvent}
        scheduleId={selectedScheduleId}
        onAttendanceSaved={handleAttendanceSaved}
      />
    </div>
  );
}