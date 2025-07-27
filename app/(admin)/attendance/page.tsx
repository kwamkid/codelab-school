'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageLoading } from '@/components/ui/loading';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/contexts/BranchContext';
import { getClasses, getClassSchedules } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getTeachersByBranch } from '@/lib/services/teachers';
import { getBranch } from '@/lib/services/branches';
import { getRoomsByBranch } from '@/lib/services/rooms';
import { Class, ClassSchedule, Subject, Teacher, Branch, Room } from '@/types/models';
import { formatTime, getDayName, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  MapPin, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  BookOpen,
  UserCheck,
  ClipboardCheck,
  X
} from 'lucide-react';

interface ClassWithDetails extends Class {
  subject?: Subject;
  teacher?: Teacher;
  branch?: Branch;
  room?: Room;
  todaySchedule?: ClassSchedule;
}

export default function AttendancePage() {
  const router = useRouter();
  const { user, isTeacher } = useAuth();
  const { selectedBranchId } = useBranch();
  const [loading, setLoading] = useState(true);
  const [allClasses, setAllClasses] = useState<ClassWithDetails[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<ClassWithDetails[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  // Filter states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    loadClassesForDate();
  }, [selectedBranchId, user, selectedDate]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedSubject, selectedTeacher, allClasses]);

  const loadClassesForDate = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get selected date's day of week
      const dayOfWeek = selectedDate.getDay();
      
      // Load subjects and teachers for filters
      const [allSubjects, branchTeachers] = await Promise.all([
        getSubjects(),
        selectedBranchId ? getTeachersByBranch(selectedBranchId) : getTeachers()
      ]);
      
      setSubjects(allSubjects.filter(s => s.isActive));
      setTeachers(branchTeachers.filter(t => t.isActive));
      
      // Get all classes
      let classes: Class[] = [];
      
      if (isTeacher()) {
        // Teacher sees only their classes
        classes = await getClasses(selectedBranchId || undefined, user.uid);
      } else {
        // Admin sees all classes in branch
        classes = await getClasses(selectedBranchId || undefined);
      }
      
      // Filter active classes that have selected day in their schedule
      const activeClasses = classes.filter(cls => 
        (cls.status === 'published' || cls.status === 'started') &&
        cls.daysOfWeek.includes(dayOfWeek)
      );
      
      // Load details and check schedules
      const classesWithDetails: ClassWithDetails[] = [];
      
      for (const cls of activeClasses) {
        // Get schedule for selected date
        const schedules = await getClassSchedules(cls.id);
        const selectedSchedule = schedules.find(schedule => {
          const scheduleDate = new Date(schedule.sessionDate);
          return scheduleDate.toDateString() === selectedDate.toDateString();
        });
        
        if (selectedSchedule) {
          // Load additional details
          const [subject, teacher, branch] = await Promise.all([
            getSubjects().then(subjects => subjects.find(s => s.id === cls.subjectId)),
            getTeachers().then(teachers => teachers.find(t => t.id === cls.teacherId)),
            getBranch(cls.branchId)
          ]);
          
          // Load rooms if not already loaded
          if (rooms.length === 0 && cls.branchId) {
            const branchRooms = await getRoomsByBranch(cls.branchId);
            setRooms(branchRooms);
          }
          
          const room = rooms.find(r => r.id === cls.roomId) || 
                       (await getRoomsByBranch(cls.branchId)).find(r => r.id === cls.roomId);
          
          classesWithDetails.push({
            ...cls,
            subject: subject || undefined,
            teacher: teacher || undefined,
            branch: branch || undefined,
            room: room || undefined,
            todaySchedule: selectedSchedule
          });
        }
      }
      
      // Sort by start time
      classesWithDetails.sort((a, b) => {
        const timeA = parseInt(a.startTime.replace(':', ''));
        const timeB = parseInt(b.startTime.replace(':', ''));
        return timeA - timeB;
      });
      
      setAllClasses(classesWithDetails);
      setFilteredClasses(classesWithDetails);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allClasses];
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(cls => 
        cls.name.toLowerCase().includes(searchLower) ||
        cls.code.toLowerCase().includes(searchLower) ||
        cls.subject?.name.toLowerCase().includes(searchLower) ||
        cls.teacher?.name.toLowerCase().includes(searchLower) ||
        cls.teacher?.nickname?.toLowerCase().includes(searchLower)
      );
    }
    
    // Subject filter
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(cls => cls.subjectId === selectedSubject);
    }
    
    // Teacher filter
    if (selectedTeacher !== 'all') {
      filtered = filtered.filter(cls => cls.teacherId === selectedTeacher);
    }
    
    setFilteredClasses(filtered);
  };

  const getAttendanceStatus = (schedule?: ClassSchedule) => {
    if (!schedule) return { status: 'pending', label: 'ยังไม่เช็คชื่อ', variant: 'secondary' as const };
    
    if (schedule.status === 'completed' || (schedule.attendance && schedule.attendance.length > 0)) {
      const attendanceCount = schedule.attendance?.filter(a => a.status === 'present').length || 0;
      const totalStudents = schedule.attendance?.length || 0;
      return { 
        status: 'completed', 
        label: `เช็คแล้ว (${attendanceCount}/${totalStudents})`, 
        variant: 'default' as const 
      };
    }
    
    if (schedule.status === 'cancelled') {
      return { status: 'cancelled', label: 'ยกเลิก', variant: 'destructive' as const };
    }
    
    return { status: 'pending', label: 'ยังไม่เช็คชื่อ', variant: 'secondary' as const };
  };

  const handleClassClick = (classId: string) => {
    router.push(`/attendance/${classId}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSubject('all');
    setSelectedTeacher('all');
    setSelectedDate(new Date());
  };

  const hasActiveFilters = searchTerm || selectedSubject !== 'all' || selectedTeacher !== 'all';

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">เช็คชื่อนักเรียน</h1>
          <p className="text-muted-foreground">
            {isToday ? 'วันนี้' : ''} {getDayName(selectedDate.getDay())} {format(selectedDate, 'd MMMM yyyy', { locale: th })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              ตัวกรอง
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                ล้างตัวกรอง
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Date Picker */}
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'd MMM yyyy', { locale: th }) : "เลือกวันที่"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหาชื่อคลาส, รหัส..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
            {/* Subject Filter */}
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <SelectValue placeholder="ทุกวิชา" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกวิชา</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Teacher Filter */}
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  <SelectValue placeholder="ทุกครู" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกครู</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.nickname || teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Results Count */}
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <span>พบ {filteredClasses.length} คลาส</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredClasses.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">
                {hasActiveFilters ? 'ไม่พบคลาสที่ตรงกับเงื่อนไข' : `ไม่มีคลาสเรียนใน${isToday ? 'วันนี้' : 'วันที่เลือก'}`}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">เวลา</TableHead>
                    <TableHead className="min-w-[250px]">คลาสเรียน</TableHead>
                    <TableHead className="min-w-[150px]">ครู / ห้อง</TableHead>
                    <TableHead className="text-center min-w-[100px]">นักเรียน</TableHead>
                    <TableHead className="min-w-[150px]">สถานะ</TableHead>
                    <TableHead className="text-center min-w-[80px]">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.map((cls) => {
                    const attendanceStatus = getAttendanceStatus(cls.todaySchedule);
                    
                    return (
                      <TableRow 
                        key={cls.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleClassClick(cls.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{formatTime(cls.startTime)} - {formatTime(cls.endTime)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: cls.subject?.color || '#ccc' }}
                              />
                              <span className="font-medium">
                                {cls.subject?.name} ครั้งที่ {cls.todaySchedule?.sessionNumber}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {cls.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {cls.teacher?.nickname || cls.teacher?.name}
                              </span>
                              {cls.todaySchedule?.actualTeacherId && 
                               cls.todaySchedule.actualTeacherId !== cls.teacherId && (
                                <Badge variant="outline" className="text-xs">แทน</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{cls.room?.name}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {cls.enrolledCount}/{cls.maxStudents} คน
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={attendanceStatus.variant}
                            className="gap-1"
                          >
                            {attendanceStatus.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                            {attendanceStatus.status === 'pending' && <AlertCircle className="h-3 w-3" />}
                            {attendanceStatus.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                            {attendanceStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClassClick(cls.id);
                            }}
                            title="เช็คชื่อ"
                          >
                            <ClipboardCheck className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}