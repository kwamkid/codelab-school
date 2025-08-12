'use client';

import { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MakeupClass, Student, Class, Branch, ClassSchedule, Subject } from '@/types/models';
import { getMakeupClasses, deleteMakeupClass } from '@/lib/services/makeup';
import { getClasses, getClassSchedule } from '@/lib/services/classes';
import { getActiveBranches } from '@/lib/services/branches';
import { getAllStudentsWithParents } from '@/lib/services/parents';
import { getSubjects } from '@/lib/services/subjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  CalendarDays,
  Trash2,
  Sparkles,
  Loader2
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';
import ScheduleMakeupDialog from '@/components/makeup/schedule-makeup-dialog';
import CreateMakeupDialog from '@/components/makeup/create-makeup-dialog';
import { auth } from '@/lib/firebase/client';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMakeup } from '@/contexts/MakeupContext';
import { useBranch } from '@/contexts/BranchContext';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { ActionButton } from '@/components/ui/action-button';
import { Skeleton } from '@/components/ui/skeleton';

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

// Cache key constants
const QUERY_KEYS = {
  makeupClasses: (branchId?: string | null) => ['makeupClasses', branchId],
  classes: (branchId?: string | null) => ['classes', branchId],
  branches: ['branches', 'active'],
  students: (branchId?: string | null) => ['students', 'withParents', branchId],
  subjects: ['subjects'],
  classSchedule: (classId: string, scheduleId: string) => ['classSchedule', classId, scheduleId],
};

export default function MakeupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { refreshMakeupCount } = useMakeup();
  const { selectedBranchId, isAllBranches } = useBranch();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Dialogs
  const [selectedMakeup, setSelectedMakeup] = useState<MakeupClass | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Optimized queries with React Query
  const { data: makeupClasses = [], isLoading: loadingMakeup } = useQuery({
    queryKey: QUERY_KEYS.makeupClasses(selectedBranchId),
    queryFn: () => getMakeupClasses(selectedBranchId),
    staleTime: 30000, // 30 seconds
  });

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: QUERY_KEYS.classes(selectedBranchId),
    queryFn: () => getClasses(selectedBranchId),
    staleTime: 60000, // 1 minute
  });

  const { data: branches = [] } = useQuery({
    queryKey: QUERY_KEYS.branches,
    queryFn: getActiveBranches,
    staleTime: 300000, // 5 minutes
  });

  const { data: students = [] } = useQuery({
    queryKey: QUERY_KEYS.students(selectedBranchId),
    queryFn: () => getAllStudentsWithParents(selectedBranchId),
    staleTime: 60000, // 1 minute
  });

  const { data: subjects = [] } = useQuery({
    queryKey: QUERY_KEYS.subjects,
    queryFn: getSubjects,
    staleTime: 300000, // 5 minutes
  });

  // Create lookup maps for better performance
  const studentsMap = useMemo(() => 
    new Map(students.map(s => [s.id, s])), 
    [students]
  );
  
  const classesMap = useMemo(() => 
    new Map(classes.map(c => [c.id, c])), 
    [classes]
  );
  
  const subjectsMap = useMemo(() => 
    new Map(subjects.map(s => [s.id, s])), 
    [subjects]
  );
  
  const branchesMap = useMemo(() => 
    new Map(branches.map(b => [b.id, b])), 
    [branches]
  );

  // Helper functions using maps
  const getStudentInfo = (studentId: string) => studentsMap.get(studentId);
  const getClassInfo = (classId: string) => classesMap.get(classId);
  const getSubjectName = (subjectId: string): string => subjectsMap.get(subjectId)?.name || '';
  const getBranchName = (branchId: string) => branchesMap.get(branchId)?.name || '-';

  // Filter makeup classes
  const filteredMakeupClasses = useMemo(() => {
    return makeupClasses.filter(makeup => {
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
      
      // Type filter (auto-generated or manual)
      if (filterType !== 'all') {
        const isAutoGenerated = makeup.requestedBy === 'system';
        if (filterType === 'auto' && !isAutoGenerated) return false;
        if (filterType === 'manual' && isAutoGenerated) return false;
      }
      
      return true;
    });
  }, [makeupClasses, searchTerm, filterStatus, filterClass, filterType, getStudentInfo, getClassInfo]);

  // Calculate statistics
  const stats = useMemo(() => {
    const autoGeneratedMakeups = makeupClasses.filter(m => m.requestedBy === 'system');
    const pendingAutoGenerated = autoGeneratedMakeups.filter(m => m.status === 'pending');
    
    return {
      total: makeupClasses.length,
      pending: makeupClasses.filter(m => m.status === 'pending').length,
      scheduled: makeupClasses.filter(m => m.status === 'scheduled').length,
      completed: makeupClasses.filter(m => m.status === 'completed').length,
      cancelled: makeupClasses.filter(m => m.status === 'cancelled').length,
      autoGenerated: autoGeneratedMakeups.length,
      pendingAutoGenerated: pendingAutoGenerated.length,
    };
  }, [makeupClasses]);

  // Refresh makeup count when data changes
  useEffect(() => {
    if (!loadingMakeup) {
      refreshMakeupCount();
    }
  }, [makeupClasses, loadingMakeup, refreshMakeupCount]);

  const handleSchedule = (makeup: MakeupClass) => {
    setSelectedMakeup(makeup);
    setShowScheduleDialog(true);
  };

  const handleViewDetail = (makeup: MakeupClass) => {
    router.push(`/makeup/${makeup.id}`);
  };

  const handleQuickDelete = (makeup: MakeupClass) => {
    setSelectedMakeup(makeup);
    setDeleteReason('');
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedMakeup || !deleteReason.trim()) {
      toast.error('กรุณาระบุเหตุผลในการลบ');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error('กรุณาเข้าสู่ระบบ');
      return;
    }

    setDeletingId(selectedMakeup.id);
    try {
      await deleteMakeupClass(selectedMakeup.id, currentUser.uid, deleteReason);
      toast.success('ลบ Makeup Class เรียบร้อยแล้ว');
      setShowDeleteDialog(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.makeupClasses(selectedBranchId) });
    } catch (error: any) {
      console.error('Error deleting makeup:', error);
      if (error.message === 'Cannot delete completed makeup class') {
        toast.error('ไม่สามารถลบ Makeup ที่เรียนเสร็จแล้วได้');
      } else {
        toast.error('ไม่สามารถลบได้');
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Loading state
  if (loadingMakeup || loadingClasses) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            จัดการการลา และชดเชย
            {!isAllBranches && <span className="text-red-600 text-lg ml-2">(เฉพาะสาขาที่เลือก)</span>}
          </h1>
          <p className="text-gray-600 mt-2">จัดการการลา และการเรียนชดเชย Makeup Class</p>
        </div>
        <PermissionGuard requiredRole={['super_admin', 'branch_admin']}>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-red-500 hover:bg-red-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            สร้าง Makeup Request
          </Button>
        </PermissionGuard>
      </div>

      {/* Alert for auto-generated makeups */}
      {stats.pendingAutoGenerated > 0 && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <Sparkles className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong className="text-orange-800">มี {stats.pendingAutoGenerated} Makeup Class ที่สร้างอัตโนมัติ</strong>
            <span className="text-orange-700 ml-1">
              จากการสมัครเรียนหลังคลาสเริ่มแล้ว รอจัดตารางเรียนชดเชย
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
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
        
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Auto-generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.autoGenerated}</div>
            {stats.pendingAutoGenerated > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                {stats.pendingAutoGenerated} รอจัดตาราง
              </p>
            )}
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
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกประเภท</SelectItem>
            <SelectItem value="manual">สร้างโดย Admin</SelectItem>
            <SelectItem value="auto">Auto-generated</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกคลาส</SelectItem>
            {classes.map(cls => (
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
                {searchTerm || filterStatus !== 'all' || filterClass !== 'all' || filterType !== 'all'
                  ? 'ลองปรับเงื่อนไขการค้นหา'
                  : 'ยังไม่มีการขอ Makeup Class'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">วันที่ขอ</TableHead>
                    <TableHead className="min-w-[120px]">นักเรียน</TableHead>
                    <TableHead className="min-w-[140px]">คลาสเดิม</TableHead>
                    <TableHead className="w-[90px]">วันที่ขาด</TableHead>
                    {isAllBranches && <TableHead className="w-[100px]">สาขา</TableHead>}
                    <TableHead className="max-w-[200px]">เหตุผล</TableHead>
                    <TableHead className="w-[110px]">วันที่นัด</TableHead>
                    <TableHead className="text-center w-[100px]">สถานะ</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMakeupClasses.map((makeup) => {
                    const student = getStudentInfo(makeup.studentId);
                    const cls = getClassInfo(makeup.originalClassId);
                    const StatusIcon = statusIcons[makeup.status];
                    const isAutoGenerated = makeup.requestedBy === 'system';
                    
                    return (
                      <TableRow key={makeup.id} className={isAutoGenerated ? 'bg-orange-50' : ''}>
                        <TableCell className="whitespace-nowrap align-top">
                          <div className="text-sm">
                            {formatDate(makeup.requestDate)}
                          </div>
                          {isAutoGenerated && (
                            <Badge variant="outline" className="mt-1 text-xs border-orange-300 text-orange-700">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Auto
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="min-w-[120px]">
                            <p className="font-medium text-sm">{student?.nickname || student?.name || '-'}</p>
                            <p className="text-xs text-gray-500">{student?.parentName || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="min-w-[140px]">
                            <p className="font-medium text-sm">{cls?.name || '-'}</p>
                            <p className="text-xs text-gray-500">{cls?.code || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap align-top">
                          {makeup.originalSessionNumber ? (
                            <div className="text-sm">
                              <p className="font-medium text-red-600">
                                ครั้งที่ {makeup.originalSessionNumber}
                              </p>
                              {makeup.originalSessionDate && (
                                <p className="text-xs text-gray-500">
                                  {formatDate(makeup.originalSessionDate)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">กำลังโหลด...</span>
                          )}
                        </TableCell>
                        {isAllBranches && (
                          <TableCell className="align-top text-sm">{cls ? getBranchName(cls.branchId) : '-'}</TableCell>
                        )}
                        <TableCell className="align-top">
                          <div className="text-sm truncate max-w-[200px]" title={makeup.reason}>
                            {makeup.reason}
                          </div>
                          {isAutoGenerated && (
                            <p className="text-xs text-orange-600 mt-1">
                              (สร้างอัตโนมัติ)
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap align-top">
                          {makeup.makeupSchedule ? (
                            <div className="text-sm">
                              <p>{formatDate(makeup.makeupSchedule.date)}</p>
                              <p className="text-xs text-gray-500">
                                {makeup.makeupSchedule.startTime} - {makeup.makeupSchedule.endTime}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center align-top">
                          <Badge className={`${statusColors[makeup.status]} text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusLabels[makeup.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top">
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
                              
                              <PermissionGuard requiredRole={['super_admin', 'branch_admin']}>
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
                                      onClick={() => handleQuickDelete(makeup)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      ลบ
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </PermissionGuard>
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

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ Makeup Class</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบ Makeup Class นี้? 
              การลบจะทำให้นักเรียนสามารถขอ Makeup ใหม่สำหรับวันนี้ได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedMakeup && (
            <div className="my-4 space-y-3">
              <div className="bg-gray-50 rounded p-3 text-sm">
                <p><strong>นักเรียน:</strong> {getStudentInfo(selectedMakeup.studentId)?.name || '-'}</p>
                <p><strong>คลาส:</strong> {getClassInfo(selectedMakeup.originalClassId)?.name || '-'}</p>
                <p><strong>สถานะ:</strong> {statusLabels[selectedMakeup.status]}</p>
                {selectedMakeup.requestedBy === 'system' && (
                  <p className="text-orange-600 mt-1">
                    <strong>หมายเหตุ:</strong> นี่คือ Makeup ที่สร้างอัตโนมัติ
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="delete-reason">เหตุผลในการลบ *</Label>
                <Textarea
                  id="delete-reason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="เช่น กรอกผิด, ผู้ปกครองขอยกเลิก..."
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>ไม่ลบ</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={!deleteReason.trim() || deletingId === selectedMakeup?.id}
              className="bg-red-500 hover:bg-red-600"
            >
              {deletingId === selectedMakeup?.id ? 'กำลังลบ...' : 'ยืนยันลบ'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule Makeup Dialog */}
      {selectedMakeup && (
        <ScheduleMakeupDialog
          open={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          makeupRequest={{
            ...selectedMakeup,
            studentName: getStudentInfo(selectedMakeup.studentId)?.name || '',
            studentNickname: getStudentInfo(selectedMakeup.studentId)?.nickname || '',
            className: getClassInfo(selectedMakeup.originalClassId)?.name || '',
            subjectName: (() => {
              const classInfo = getClassInfo(selectedMakeup.originalClassId);
              return classInfo ? getSubjectName(classInfo.subjectId) : '';
            })(),
          }}
          onSuccess={async () => {
            setShowScheduleDialog(false);
            // Invalidate and refetch
            await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.makeupClasses(selectedBranchId) });
          }}
        />
      )}

      {/* Create Makeup Dialog */}
      <CreateMakeupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        classes={classes}
        students={students}
        onCreated={async () => {
          setShowCreateDialog(false);
          // Invalidate and refetch
          await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.makeupClasses(selectedBranchId) });
          toast.success('สร้าง Makeup Request เรียบร้อยแล้ว');
        }}
      />
    </div>
  );
}