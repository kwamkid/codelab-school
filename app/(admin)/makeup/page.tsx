'use client';

import { useEffect, useState } from 'react';
import { MakeupClass, Student, Class, Branch, ClassSchedule } from '@/types/models';
import { getMakeupClasses } from '@/lib/services/makeup';
import { getClasses, getClassSchedule } from '@/lib/services/classes';
import { getActiveBranches } from '@/lib/services/branches';
import { getAllStudentsWithParents } from '@/lib/services/parents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Clock,
  User,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  Eye,
  CalendarCheck,
  MoreVertical,
  CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatTime } from '@/lib/utils';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import ScheduleMakeupDialog from '@/components/makeup/schedule-makeup-dialog';
import MakeupDetailDialog from '@/components/makeup/makeup-detail-dialog';
import CreateMakeupDialog from '@/components/makeup/create-makeup-dialog';

type StudentWithParent = Student & { parentName: string; parentPhone: string };

const statusColors = {
  'pending': 'bg-yellow-100 text-yellow-700',
  'scheduled': 'bg-blue-100 text-blue-700',
  'completed': 'bg-green-100 text-green-700',
  'cancelled': 'bg-red-100 text-red-700',
};

const statusLabels = {
  'pending': 'รอจัดตาราง',
  'scheduled': 'นัดแล้ว',
  'completed': 'เรียนแล้ว',
  'cancelled': 'ยกเลิก',
};

const statusIcons = {
  'pending': AlertCircle,
  'scheduled': CalendarCheck,
  'completed': CheckCircle,
  'cancelled': XCircle,
};

export default function MakeupPage() {
  const [makeupClasses, setMakeupClasses] = useState<MakeupClass[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [students, setStudents] = useState<StudentWithParent[]>([]);
  const [loading, setLoading] = useState(true);
  const [originalSchedules, setOriginalSchedules] = useState<Record<string, ClassSchedule>>({});
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  
  // Dialogs
  const [selectedMakeup, setSelectedMakeup] = useState<MakeupClass | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [makeupData, classesData, branchesData, studentsData] = await Promise.all([
        getMakeupClasses(),
        getClasses(),
        getActiveBranches(),
        getAllStudentsWithParents()
      ]);
      
      setMakeupClasses(makeupData);
      setClasses(classesData);
      setBranches(branchesData);
      setStudents(studentsData);
      
      // Load original schedules for each makeup
      const schedules: Record<string, ClassSchedule> = {};
      for (const makeup of makeupData) {
        if (makeup.originalClassId && makeup.originalScheduleId) {
          try {
            const schedule = await getClassSchedule(makeup.originalClassId, makeup.originalScheduleId);
            if (schedule) {
              schedules[makeup.id] = schedule;
            }
          } catch (error) {
            console.error('Error loading schedule:', error);
          }
        }
      }
      setOriginalSchedules(schedules);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getStudentInfo = (studentId: string) => {
    return students.find(s => s.id === studentId);
  };

  const getClassInfo = (classId: string) => {
    return classes.find(c => c.id === classId);
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || 'Unknown';
  };

  // Filter makeup classes
  const filteredMakeupClasses = makeupClasses.filter(makeup => {
    // Search filter
    if (searchTerm) {
      const student = getStudentInfo(makeup.studentId);
      const cls = getClassInfo(makeup.originalClassId);
      const searchLower = searchTerm.toLowerCase();
      
      const matchesSearch = 
        student?.name.toLowerCase().includes(searchLower) ||
        student?.nickname.toLowerCase().includes(searchLower) ||
        student?.parentName.toLowerCase().includes(searchLower) ||
        cls?.name.toLowerCase().includes(searchLower) ||
        makeup.reason.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (filterStatus !== 'all' && makeup.status !== filterStatus) return false;
    
    // Class filter
    if (filterClass !== 'all' && makeup.originalClassId !== filterClass) return false;
    
    // Branch filter
    if (filterBranch !== 'all') {
      const cls = getClassInfo(makeup.originalClassId);
      if (!cls || cls.branchId !== filterBranch) return false;
    }
    
    return true;
  });

  // Calculate statistics
  const stats = {
    total: makeupClasses.length,
    pending: makeupClasses.filter(m => m.status === 'pending').length,
    scheduled: makeupClasses.filter(m => m.status === 'scheduled').length,
    completed: makeupClasses.filter(m => m.status === 'completed').length,
    cancelled: makeupClasses.filter(m => m.status === 'cancelled').length,
  };

  const handleSchedule = (makeup: MakeupClass) => {
    setSelectedMakeup(makeup);
    setShowScheduleDialog(true);
  };

  const handleViewDetail = (makeup: MakeupClass) => {
    setSelectedMakeup(makeup);
    setShowDetailDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">จัดการ Makeup Class</h1>
          <p className="text-gray-600 mt-2">จัดการคลาสเรียนชดเชยสำหรับนักเรียนที่ขาดเรียน</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-red-500 hover:bg-red-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          สร้าง Makeup Request
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">รอจัดตาราง</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">นัดแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">เรียนแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ยกเลิก</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="ค้นหาชื่อนักเรียน, ผู้ปกครอง, คลาส, เหตุผล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            <SelectItem value="pending">รอจัดตาราง</SelectItem>
            <SelectItem value="scheduled">นัดแล้ว</SelectItem>
            <SelectItem value="completed">เรียนแล้ว</SelectItem>
            <SelectItem value="cancelled">ยกเลิก</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterBranch} onValueChange={setFilterBranch}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
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
        
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกคลาส</SelectItem>
            {classes
              .filter(cls => filterBranch === 'all' || cls.branchId === filterBranch)
              .map(cls => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Makeup Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการ Makeup Class ({filteredMakeupClasses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMakeupClasses.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ไม่พบข้อมูล Makeup Class
              </h3>
              <p className="text-gray-600">
                {searchTerm || filterStatus !== 'all' || filterBranch !== 'all' || filterClass !== 'all'
                  ? 'ลองปรับเงื่อนไขการค้นหา'
                  : 'ยังไม่มีการขอ Makeup Class'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่ขอ</TableHead>
                    <TableHead>นักเรียน</TableHead>
                    <TableHead>คลาสเดิม</TableHead>
                    <TableHead>วันที่ขาด</TableHead>
                    <TableHead>สาขา</TableHead>
                    <TableHead>เหตุผล</TableHead>
                    <TableHead>วันที่นัด</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMakeupClasses.map((makeup) => {
                    const student = getStudentInfo(makeup.studentId);
                    const cls = getClassInfo(makeup.originalClassId);
                    const StatusIcon = statusIcons[makeup.status];
                    const originalSchedule = originalSchedules[makeup.id];
                    
                    return (
                      <TableRow key={makeup.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(makeup.requestDate)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student?.nickname || student?.name}</p>
                            <p className="text-xs text-gray-500">{student?.parentName}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{cls?.name}</p>
                            <p className="text-xs text-gray-500">{cls?.code}</p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {originalSchedule ? (
                            <div>
                              <p className="font-medium">
                                ครั้งที่ {originalSchedule.sessionNumber}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(originalSchedule.sessionDate)}
                              </p>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{cls ? getBranchName(cls.branchId) : '-'}</TableCell>
                        <TableCell>
                          <p className="text-sm line-clamp-1">{makeup.reason}</p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {makeup.makeupSchedule ? (
                            <div>
                              <p>{formatDate(makeup.makeupSchedule.date)}</p>
                              <p className="text-xs text-gray-500">
                                {makeup.makeupSchedule.startTime} - {makeup.makeupSchedule.endTime}
                              </p>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={statusColors[makeup.status]}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusLabels[makeup.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">เปิดเมนู</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>จัดการ</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem onClick={() => handleViewDetail(makeup)}>
                                <Eye className="h-4 w-4 mr-2" />
                                ดูรายละเอียด
                              </DropdownMenuItem>
                              
                              {makeup.status === 'pending' && (
                                <DropdownMenuItem 
                                  onClick={() => handleSchedule(makeup)}
                                  className="text-blue-600"
                                >
                                  <CalendarCheck className="h-4 w-4 mr-2" />
                                  จัดตาราง
                                </DropdownMenuItem>
                              )}
                              
                              {makeup.status === 'scheduled' && (
                                <DropdownMenuItem 
                                  onClick={() => handleViewDetail(makeup)}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  บันทึกการเข้าเรียน
                                </DropdownMenuItem>
                              )}
                              
                              {(makeup.status === 'pending' || makeup.status === 'scheduled') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleViewDetail(makeup)}
                                    className="text-red-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    ยกเลิก
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Makeup Dialog */}
      {selectedMakeup && (
        <ScheduleMakeupDialog
          open={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          makeup={selectedMakeup}
          student={getStudentInfo(selectedMakeup.studentId)!}
          classInfo={getClassInfo(selectedMakeup.originalClassId)!}
          onScheduled={() => {
            setShowScheduleDialog(false);
            loadData();
            toast.success('จัดตาราง Makeup Class เรียบร้อยแล้ว');
          }}
        />
      )}

      {/* Makeup Detail Dialog */}
      {selectedMakeup && (
        <MakeupDetailDialog
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          makeup={selectedMakeup}
          student={getStudentInfo(selectedMakeup.studentId)!}
          classInfo={getClassInfo(selectedMakeup.originalClassId)!}
          onUpdated={() => {
            setShowDetailDialog(false);
            loadData();
          }}
        />
      )}

      {/* Create Makeup Dialog */}
      <CreateMakeupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        classes={classes}
        students={students}
        onCreated={() => {
          setShowCreateDialog(false);
          loadData();
          toast.success('สร้าง Makeup Request เรียบร้อยแล้ว');
        }}
      />
    </div>
  );
}