'use client';

import { useEffect, useState } from 'react';
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
  Sparkles
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
  const router = useRouter();
  const [makeupClasses, setMakeupClasses] = useState<MakeupClass[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [students, setStudents] = useState<StudentWithParent[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [originalSchedules, setOriginalSchedules] = useState<Record<string, ClassSchedule | null>>({});
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all'); // เพิ่ม filter สำหรับ auto-generated
  
  // Dialogs
  const [selectedMakeup, setSelectedMakeup] = useState<MakeupClass | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log('=== Starting loadData ===');
    try {
      const [makeupData, classesData, branchesData, studentsData, subjectsData] = await Promise.all([
        getMakeupClasses(),
        getClasses(),
        getActiveBranches(),
        getAllStudentsWithParents(),
        getSubjects()
      ]);
      
      console.log('Makeup data loaded:', makeupData);
      console.log('Classes data loaded:', classesData);
      console.log('Subjects data loaded:', subjectsData);
      
      setMakeupClasses(makeupData);
      setClasses(classesData);
      setBranches(branchesData);
      setStudents(studentsData);
      setSubjects(subjectsData);
      
      // Load original schedules for each makeup
      console.log('=== Loading schedules for makeups ===');
      const schedules: Record<string, ClassSchedule | null> = {};
      
      for (const makeup of makeupData) {
        console.log(`\nProcessing makeup ${makeup.id}:`, {
          originalClassId: makeup.originalClassId,
          originalScheduleId: makeup.originalScheduleId,
          hasClassId: !!makeup.originalClassId,
          hasScheduleId: !!makeup.originalScheduleId
        });
        
        if (makeup.originalClassId && makeup.originalScheduleId) {
          try {
            console.log(`Calling getClassSchedule(${makeup.originalClassId}, ${makeup.originalScheduleId})`);
            const schedule = await getClassSchedule(makeup.originalClassId, makeup.originalScheduleId);
            console.log(`Schedule result:`, schedule);
            schedules[makeup.id] = schedule;
          } catch (error) {
            console.error(`Error loading schedule for makeup ${makeup.id}:`, error);
            schedules[makeup.id] = null;
          }
        } else {
          console.log(`Skipping - missing IDs`);
          schedules[makeup.id] = null;
        }
      }
      
      console.log('=== Final schedules object:', schedules);
      setOriginalSchedules(schedules);
    } catch (error) {
      console.error('Error in loadData:', error);
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

  const getSubjectName = (subjectId: string): string => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || '';
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || '-';
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
    
    // Type filter (auto-generated or manual)
    if (filterType !== 'all') {
      const isAutoGenerated = makeup.requestedBy === 'system';
      if (filterType === 'auto' && !isAutoGenerated) return false;
      if (filterType === 'manual' && isAutoGenerated) return false;
    }
    
    return true;
  });

  // Calculate statistics
  const autoGeneratedMakeups = makeupClasses.filter(m => m.requestedBy === 'system');
  const pendingAutoGenerated = autoGeneratedMakeups.filter(m => m.status === 'pending');
  
  const stats = {
    total: makeupClasses.length,
    pending: makeupClasses.filter(m => m.status === 'pending').length,
    scheduled: makeupClasses.filter(m => m.status === 'scheduled').length,
    completed: makeupClasses.filter(m => m.status === 'completed').length,
    cancelled: makeupClasses.filter(m => m.status === 'cancelled').length,
    autoGenerated: autoGeneratedMakeups.length,
    pendingAutoGenerated: pendingAutoGenerated.length,
  };

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
      loadData();
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

      {/* Alert for auto-generated makeups */}
      {pendingAutoGenerated.length > 0 && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <Sparkles className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong className="text-orange-800">มี {pendingAutoGenerated.length} Makeup Class ที่สร้างอัตโนมัติ</strong>
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
                {searchTerm || filterStatus !== 'all' || filterBranch !== 'all' || filterClass !== 'all' || filterType !== 'all'
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
                    const isAutoGenerated = makeup.requestedBy === 'system';
                    
                    return (
                      <TableRow key={makeup.id} className={isAutoGenerated ? 'bg-orange-50' : ''}>
                        <TableCell className="whitespace-nowrap">
                          <div>
                            {formatDate(makeup.requestDate)}
                            {isAutoGenerated && (
                              <Badge variant="outline" className="ml-2 text-xs border-orange-300 text-orange-700">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Auto
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student?.nickname || student?.name || '-'}</p>
                            <p className="text-xs text-gray-500">{student?.parentName || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{cls?.name || '-'}</p>
                            <p className="text-xs text-gray-500">{cls?.code || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {(() => {
                            const originalSchedule = originalSchedules[makeup.id];
                            
                            // ถ้ามี schedule data จาก Firebase
                            if (originalSchedule) {
                              return (
                                <div>
                                  <p className="font-medium text-red-600">
                                    ครั้งที่ {originalSchedule.sessionNumber}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(originalSchedule.sessionDate)}
                                  </p>
                                </div>
                              );
                            }
                            
                            // ถ้าไม่มี schedule แต่อาจมีข้อมูลใน makeup document
                            if (makeup.originalSessionNumber || makeup.originalSessionDate) {
                              return (
                                <div>
                                  {makeup.originalSessionNumber && (
                                    <p className="font-medium text-red-600">
                                      ครั้งที่ {makeup.originalSessionNumber}
                                    </p>
                                  )}
                                  {makeup.originalSessionDate && (
                                    <p className="text-xs text-gray-500">
                                      {formatDate(makeup.originalSessionDate)}
                                    </p>
                                  )}
                                </div>
                              );
                            }
                            
                            // ถ้าไม่มีข้อมูลเลย
                            return <span className="text-gray-400">ไม่มีข้อมูล</span>;
                          })()}
                        </TableCell>
                        <TableCell>{cls ? getBranchName(cls.branchId) : '-'}</TableCell>
                        <TableCell>
                          <p className="text-sm line-clamp-1">{makeup.reason}</p>
                          {isAutoGenerated && (
                            <p className="text-xs text-orange-600 mt-1">
                              (สร้างอัตโนมัติ)
                            </p>
                          )}
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
                            <span className="text-gray-400">-</span>
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
                                    onClick={() => handleQuickDelete(makeup)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    ลบ
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
          onSuccess={() => {
            setShowScheduleDialog(false);
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