'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import DashboardCalendar from '@/components/dashboard/dashboard-calendar';
import ClassDetailDialog from '@/components/dashboard/class-detail-dialog';
import { getOptimizedCalendarEvents, CalendarEvent, getOptimizedDashboardStats, clearDashboardCache } from '@/lib/services/dashboard-optimized';
import { getActiveBranches } from '@/lib/services/branches';
import { Branch, MakeupClass } from '@/types/models';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar as CalendarIcon, UserX, AlertCircle, Users, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { DatesSetArg, EventClickArg } from '@fullcalendar/core';
import FullCalendar from '@fullcalendar/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { getMakeupClasses } from '@/lib/services/makeup';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

interface AbsentStudent {
  studentId: string;
  studentName: string;
  className: string;
  classTime: string;
  reason?: string;
  makeupStatus?: 'pending' | 'scheduled' | 'completed';
}

interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  activeClasses: number;
  todayClasses: number;
  upcomingMakeups: number;
  pendingMakeups: number;
  upcomingTrials: number;
}

export default function DashboardPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [showHalfHour, setShowHalfHour] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [absentStudents, setAbsentStudents] = useState<AbsentStudent[]>([]);
  const [makeupRequests, setMakeupRequests] = useState<MakeupClass[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
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
  
  // Load stats separately
  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const branchIdToQuery = selectedBranch === 'all' ? undefined : selectedBranch;
        const fetchedStats = await getOptimizedDashboardStats(branchIdToQuery);
        setStats(fetchedStats);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    
    loadStats();
  }, [selectedBranch]);
  
  const handleDatesSet = useCallback(async (dateInfo: DatesSetArg) => {
    setLoading(true);
    setDateRange({ start: dateInfo.start, end: dateInfo.end });
    
    try {
      const branchIdToQuery = selectedBranch === 'all' ? undefined : selectedBranch;
      const fetchedEvents = await getOptimizedCalendarEvents(dateInfo.start, dateInfo.end, branchIdToQuery);
      setEvents(fetchedEvents);
      
      // Load absent students and makeup requests for today
      await loadAbsentStudentsData(fetchedEvents, dateInfo.start, dateInfo.end, branchIdToQuery);
    } catch (error) {
      toast.error('ไม่สามารถโหลดข้อมูลตารางเรียนได้');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);
  
  // Load absent students and makeup requests
  const loadAbsentStudentsData = async (allEvents: CalendarEvent[], startDate: Date, endDate: Date, branchId?: string) => {
    try {
      // Get today's events
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      // Filter today's class events
      const todayEvents = allEvents.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate >= today && eventDate <= todayEnd && event.extendedProps.type === 'class';
      });
      
      // Get makeup requests
      const makeupData = await getMakeupClasses();
      const todayMakeupRequests = makeupData.filter(makeup => {
        const requestDate = new Date(makeup.requestDate);
        return requestDate >= today && requestDate <= todayEnd && 
               (makeup.status === 'pending' || makeup.status === 'scheduled');
      });
      setMakeupRequests(todayMakeupRequests);
      
      // Process absent students from events
      const absentList: AbsentStudent[] = [];
      
      for (const event of todayEvents) {
        if (event.extendedProps.attendance) {
          const absentAttendance = event.extendedProps.attendance.filter(
            (att: any) => att.status === 'absent'
          );
          
          for (const absent of absentAttendance) {
            // Find makeup request for this student
            const makeupRequest = todayMakeupRequests.find(
              m => m.studentId === absent.studentId && 
                   m.originalClassId === event.classId &&
                   m.originalScheduleId === event.id.split('-')[1]
            );
            
            absentList.push({
              studentId: absent.studentId,
              studentName: absent.studentName || 'ไม่ระบุชื่อ',
              className: event.title,
              classTime: `${event.extendedProps.startTime} - ${event.extendedProps.endTime}`,
              reason: absent.note,
              makeupStatus: makeupRequest?.status as any
            });
          }
        }
      }
      
      setAbsentStudents(absentList);
    } catch (error) {
      console.error('Error loading absent students:', error);
    }
  };
  
  // Re-apply filters when branch changes
  const handleBranchChange = async (value: string) => {
    setSelectedBranch(value);
    
    // Re-fetch events with new branch filter
    if (dateRange) {
      setLoading(true);
      try {
        const branchIdToQuery = value === 'all' ? undefined : value;
        const fetchedEvents = await getOptimizedCalendarEvents(dateRange.start, dateRange.end, branchIdToQuery);
        setEvents(fetchedEvents);
        
        // Reload absent students data
        await loadAbsentStudentsData(fetchedEvents, dateRange.start, dateRange.end, branchIdToQuery);
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
        makeupStatus: clickInfo.event.extendedProps.makeupStatus,
        subjectColor: clickInfo.event.extendedProps.subjectColor,
        trialStudentName: clickInfo.event.extendedProps.trialStudentName,
        trialSubjectName: clickInfo.event.extendedProps.trialSubjectName
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
    
    // Clear cache to force refresh
    clearDashboardCache();
    
    // Reload events to reflect the updated status
    if (dateRange) {
      setLoading(true);
      try {
        const branchIdToQuery = selectedBranch === 'all' ? undefined : selectedBranch;
        const fetchedEvents = await getOptimizedCalendarEvents(dateRange.start, dateRange.end, branchIdToQuery);
        setEvents(fetchedEvents);
        
        // Reload absent students data
        await loadAbsentStudentsData(fetchedEvents, dateRange.start, dateRange.end, branchIdToQuery);
        
        // Reload stats
        const fetchedStats = await getOptimizedDashboardStats(branchIdToQuery);
        setStats(fetchedStats);
        
        toast.success('บันทึกการเช็คชื่อเรียบร้อยแล้ว');
      } catch (error) {
        console.error('Error reloading events:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    clearDashboardCache();
    // Reload data
    if (dateRange) {
      await handleDatesSet({ 
        start: dateRange.start, 
        end: dateRange.end, 
        startStr: dateRange.start.toISOString(),
        endStr: dateRange.end.toISOString(),
        view: {} as any,
        timeZone: 'local'
      } as DatesSetArg);
    }
    // Reload stats
    const branchIdToQuery = selectedBranch === 'all' ? undefined : selectedBranch;
    const fetchedStats = await getOptimizedDashboardStats(branchIdToQuery);
    setStats(fetchedStats);
    
    toast.success('รีเฟรชข้อมูลเรียบร้อยแล้ว');
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">ภาพรวมตารางเรียนและข้อมูลสำคัญ</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
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
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">นักเรียนทั้งหมด</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalStudents}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">คลาสที่เปิดสอน</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.activeClasses}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">คลาสวันนี้</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.todayClasses}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Makeup รอจัด</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.pendingMakeups}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Absent Students Card */}
      {absentStudents.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-lg">นักเรียนขาดเรียนวันนี้</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                {absentStudents.length} คน
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {absentStudents.map((student, index) => (
                <div key={`${student.studentId}-${index}`} className="flex items-start justify-between p-3 bg-white rounded-lg border border-orange-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{student.studentName}</span>
                      {student.makeupStatus && (
                        <Badge 
                          variant="outline" 
                          className={
                            student.makeupStatus === 'scheduled' ? 'border-green-500 text-green-700' :
                            student.makeupStatus === 'completed' ? 'border-gray-500 text-gray-700' :
                            'border-yellow-500 text-yellow-700'
                          }
                        >
                          {student.makeupStatus === 'pending' ? 'รอจัด Makeup' :
                           student.makeupStatus === 'scheduled' ? 'นัด Makeup แล้ว' :
                           'เรียน Makeup แล้ว'}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      <span>{student.className}</span>
                      <span className="mx-2">•</span>
                      <span>{student.classTime}</span>
                    </div>
                    {student.reason && (
                      <p className="text-sm text-gray-500 mt-1">เหตุผล: {student.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Makeup Requests Summary */}
      {makeupRequests.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">คำขอ Makeup Class</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                {makeupRequests.filter(m => m.status === 'pending').length} รอดำเนินการ
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>รอจัดตาราง: {makeupRequests.filter(m => m.status === 'pending').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>นัดแล้ว: {makeupRequests.filter(m => m.status === 'scheduled').length}</span>
                </div>
              </div>
              <a href="/makeup" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                ดูทั้งหมด →
              </a>
            </div>
          </CardContent>
        </Card>
      )}

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
            ref={calendarRef}
            events={events} 
            onDatesSet={handleDatesSet}
            onEventClick={handleEventClick}
            showHalfHour={showHalfHour}
            setShowHalfHour={setShowHalfHour}
            initialView="timeGridDay" // Change to day view as default
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