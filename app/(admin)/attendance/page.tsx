'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageLoading } from '@/components/ui/loading';
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
import { getTeachersByBranch, getTeachers } from '@/lib/services/teachers';
import { getBranch, getBranches } from '@/lib/services/branches';
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
  Building2
} from 'lucide-react';

interface ClassWithDetails extends Class {
  subject?: Subject;
  teacher?: Teacher;
  branch?: Branch;
  room?: Room;
  todaySchedule?: ClassSchedule;
}

// Cache for room data
const roomCache = new Map<string, Room[]>();

export default function AttendancePage() {
  const router = useRouter();
  const { user, isTeacher, adminUser, canAccessBranch, isSuperAdmin } = useAuth();
  const { selectedBranchId, isAllBranches } = useBranch();
  const [loading, setLoading] = useState(true);
  const [allClasses, setAllClasses] = useState<ClassWithDetails[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roomsByBranch, setRoomsByBranch] = useState<Map<string, Room[]>>(new Map());
  
  // Master data states (loaded once)
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  
  // Filter states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');

  // Load master data once on mount
  useEffect(() => {
    loadMasterData();
  }, []);

  // Load classes when date or branch changes
  useEffect(() => {
    if (subjects.length > 0 && allTeachers.length > 0) {
      loadClassesForDate();
    }
  }, [selectedBranchId, selectedDate, subjects, allTeachers]);

  const loadMasterData = async () => {
    try {
      // Load all master data in parallel
      const [subjectsData, teachersData, branchesData] = await Promise.all([
        getSubjects(),
        getTeachers(),
        getBranches()
      ]);

      setSubjects(subjectsData.filter(s => s.isActive));
      setAllTeachers(teachersData.filter(t => t.isActive));
      setBranches(branchesData);
    } catch (error) {
      console.error('Error loading master data:', error);
    }
  };

  const loadClassesForDate = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Get selected date's day of week
      const dayOfWeek = selectedDate.getDay();
      
      // Determine which classes to load
      let classes: Class[] = [];
      
      if (isAllBranches && isSuperAdmin()) {
        // Load all classes for super admin
        if (isTeacher() && adminUser) {
          classes = await getClasses(undefined, adminUser.id);
        } else {
          classes = await getClasses();
        }
      } else if (selectedBranchId) {
        // Load classes for specific branch
        if (!canAccessBranch(selectedBranchId)) {
          setAllClasses([]);
          setLoading(false);
          return;
        }
        
        if (isTeacher() && adminUser) {
          classes = await getClasses(selectedBranchId, adminUser.id);
        } else {
          classes = await getClasses(selectedBranchId);
        }
      } else {
        // No branch selected
        setAllClasses([]);
        setLoading(false);
        return;
      }
      
      // Filter active classes that have selected day in their schedule
      const activeClasses = classes.filter(cls => 
        (cls.status === 'published' || cls.status === 'started') &&
        cls.daysOfWeek.includes(dayOfWeek)
      );
      
      if (activeClasses.length === 0) {
        setAllClasses([]);
        setLoading(false);
        return;
      }
      
      // Create maps for quick lookup
      const subjectMap = new Map(subjects.map(s => [s.id, s]));
      const teacherMap = new Map(allTeachers.map(t => [t.id, t]));
      const branchMap = new Map(branches.map(b => [b.id, b]));
      
      // Batch load schedules for all classes
      const schedulePromises = activeClasses.map(cls => 
        getClassSchedules(cls.id).then(schedules => ({
          classId: cls.id,
          schedules
        }))
      );
      
      const allSchedules = await Promise.all(schedulePromises);
      const scheduleMap = new Map(allSchedules.map(({ classId, schedules }) => [classId, schedules]));
      
      // Get unique branch IDs that need room data
      const uniqueBranchIds = [...new Set(activeClasses.map(cls => cls.branchId))];
      
      // Load rooms for branches (with cache)
      const roomPromises = uniqueBranchIds.map(async (branchId) => {
        if (roomCache.has(branchId)) {
          return { branchId, rooms: roomCache.get(branchId)! };
        }
        
        const rooms = await getRoomsByBranch(branchId);
        roomCache.set(branchId, rooms);
        return { branchId, rooms };
      });
      
      const roomResults = await Promise.all(roomPromises);
      const newRoomsByBranch = new Map(roomResults.map(({ branchId, rooms }) => [branchId, rooms]));
      setRoomsByBranch(newRoomsByBranch);
      
      // Build class details
      const classesWithDetails: ClassWithDetails[] = [];
      
      for (const cls of activeClasses) {
        // Skip if user doesn't have access to branch
        if (!isSuperAdmin() && !canAccessBranch(cls.branchId)) {
          continue;
        }
        
        // Get schedule for selected date
        const schedules = scheduleMap.get(cls.id) || [];
        const selectedSchedule = schedules.find(schedule => {
          const scheduleDate = new Date(schedule.sessionDate);
          return scheduleDate.toDateString() === selectedDate.toDateString();
        });
        
        if (selectedSchedule) {
          // Get details from maps (instant lookup)
          const subject = subjectMap.get(cls.subjectId);
          const teacher = teacherMap.get(cls.teacherId);
          const branch = branchMap.get(cls.branchId);
          const branchRooms = newRoomsByBranch.get(cls.branchId) || [];
          const room = branchRooms.find(r => r.id === cls.roomId);
          
          classesWithDetails.push({
            ...cls,
            subject,
            teacher,
            branch,
            room,
            todaySchedule: selectedSchedule
          });
        }
      }
      
      // Sort
      classesWithDetails.sort((a, b) => {
        if (isAllBranches) {
          const branchCompare = (a.branch?.name || '').localeCompare(b.branch?.name || '');
          if (branchCompare !== 0) return branchCompare;
        }
        
        const timeA = parseInt(a.startTime.replace(':', ''));
        const timeB = parseInt(b.startTime.replace(':', ''));
        return timeA - timeB;
      });
      
      setAllClasses(classesWithDetails);
      
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter teachers based on selection and role
  const availableTeachers = useMemo(() => {
    let teachers = allTeachers;
    
    // Filter by branch if specific branch selected
    if (selectedBranchId && !isAllBranches) {
      teachers = teachers.filter(t => t.availableBranches.includes(selectedBranchId));
    }
    
    // If teacher role, only show themselves
    if (isTeacher() && adminUser) {
      teachers = teachers.filter(t => t.id === adminUser.id);
    }
    
    return teachers;
  }, [allTeachers, selectedBranchId, isAllBranches, isTeacher, adminUser]);

  // Apply filters with memoization
  const filteredClasses = useMemo(() => {
    let filtered = [...allClasses];
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(cls => 
        cls.name.toLowerCase().includes(searchLower) ||
        cls.code.toLowerCase().includes(searchLower) ||
        cls.subject?.name.toLowerCase().includes(searchLower) ||
        cls.teacher?.name.toLowerCase().includes(searchLower) ||
        cls.teacher?.nickname?.toLowerCase().includes(searchLower) ||
        cls.branch?.name.toLowerCase().includes(searchLower)
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
    
    return filtered;
  }, [allClasses, searchTerm, selectedSubject, selectedTeacher]);

  const getAttendanceStatus = (schedule?: ClassSchedule) => {
    if (!schedule) return { status: 'pending', label: 'ยังไม่เช็คชื่อ', variant: 'secondary' as const };
    
    if (schedule.status === 'completed' || (schedule.attendance && schedule.attendance.length > 0)) {
      const attendanceCount = schedule.attendance?.filter(a => a.status === 'present').length || 0;
      const totalStudents = schedule.attendance?.length || 0;
      
      if (totalStudents === 0) {
        return { 
          status: 'completed', 
          label: 'เช็คแล้ว', 
          variant: 'default' as const 
        };
      }
      
      // แสดงจำนวนที่มาเรียน
      return { 
        status: 'completed', 
        label: `มาเรียน ${attendanceCount} คน`, 
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

  // Format date for input
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle date change from input
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) return;
    
    const [year, month, day] = value.split('-').map(Number);
    const newDate = new Date(year, month - 1, day);
    newDate.setHours(0, 0, 0, 0);
    
    setSelectedDate(newDate);
  };

  if (loading) return <PageLoading />;

  // Show empty state if no branch selected and not super admin viewing all branches
  if (!selectedBranchId && !isAllBranches) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">เช็คชื่อนักเรียน</h1>
            <p className="text-muted-foreground">เลือกสาขาเพื่อดูคลาสเรียน</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">กรุณาเลือกสาขาเพื่อดูคลาสเรียน</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">เช็คชื่อนักเรียน</h1>
          <p className="text-muted-foreground">
            {isToday ? 'วันนี้' : ''} {getDayName(selectedDate.getDay())} {format(selectedDate, 'd MMMM yyyy', { locale: th })}
            {isAllBranches && ' - ทุกสาขา'}
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
            <div>
              <label className="text-sm font-medium mb-2 block">วันที่</label>
              <input
                type="date"
                value={formatDateForInput(selectedDate)}
                onChange={handleDateChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent h-9"
              />
            </div>
            
            {/* Search */}
            <div>
              <label className="text-sm font-medium mb-2 block">ค้นหา</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="ชื่อคลาส, รหัส..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full h-9"
                />
              </div>
            </div>
            
            {/* Subject Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">วิชา</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full h-9">
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
            </div>
            
            {/* Teacher Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">ครู</label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="w-full h-9">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    <SelectValue placeholder="ทุกครู" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกครู</SelectItem>
                  {availableTeachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.nickname || teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Results Count */}
            <div className="flex items-center justify-center">
              <span className="text-sm text-muted-foreground">พบ {filteredClasses.length} คลาส</span>
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
                    {isAllBranches && <TableHead className="min-w-[100px]">สาขา</TableHead>}
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
                        {isAllBranches && (
                          <TableCell>
                            <Badge variant="outline">
                              {cls.branch?.name}
                            </Badge>
                          </TableCell>
                        )}
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
                            {cls.enrolledCount} คน
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