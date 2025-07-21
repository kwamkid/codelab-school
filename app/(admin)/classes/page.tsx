'use client';

import { useEffect, useState } from 'react';
import { Class, Branch, Subject, Teacher } from '@/types/models';
import { getClasses, deleteClass } from '@/lib/services/classes';
import { getActiveBranches } from '@/lib/services/branches';
import { getActiveSubjects } from '@/lib/services/subjects';
import { getActiveTeachers } from '@/lib/services/teachers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Calendar, 
  Users, 
  Clock, 
  MapPin, 
  Trash2, 
  Edit, 
  Eye,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, getDayName } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusColors = {
  'draft': 'bg-gray-100 text-gray-700',
  'published': 'bg-blue-100 text-blue-700',
  'started': 'bg-green-100 text-green-700',
  'completed': 'bg-gray-100 text-gray-700',
  'cancelled': 'bg-red-100 text-red-700',
};

const statusLabels = {
  'draft': 'ร่าง',
  'published': 'เปิดรับสมัคร',
  'started': 'กำลังเรียน',
  'completed': 'จบแล้ว',
  'cancelled': 'ยกเลิก',
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [classesData, branchesData, subjectsData, teachersData] = await Promise.all([
        getClasses(),
        getActiveBranches(),
        getActiveSubjects(),
        getActiveTeachers()
      ]);
      
      setClasses(classesData);
      setBranches(branchesData);
      setSubjects(subjectsData);
      setTeachers(teachersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    setDeletingId(classId);
    try {
      await deleteClass(classId);
      toast.success(`ลบคลาส ${className} เรียบร้อยแล้ว`);
      loadData(); // Reload data
    } catch (error: any) {
      console.error('Error deleting class:', error);
      if (error.message === 'Cannot delete class with enrolled students') {
        toast.error('ไม่สามารถลบคลาสที่มีนักเรียนลงทะเบียนแล้ว');
      } else {
        toast.error('ไม่สามารถลบคลาสได้');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || 'Unknown';
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Unknown';
  };

  const getSubjectColor = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.color || '#gray';
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher?.nickname || teacher?.name || 'Unknown';
  };

  // Filter classes
  const filteredClasses = classes.filter(cls => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        cls.name.toLowerCase().includes(search) ||
        cls.code.toLowerCase().includes(search) ||
        getSubjectName(cls.subjectId).toLowerCase().includes(search) ||
        getTeacherName(cls.teacherId).toLowerCase().includes(search) ||
        getBranchName(cls.branchId).toLowerCase().includes(search);
      
      if (!matchesSearch) return false;
    }

    // Other filters
    if (selectedBranch !== 'all' && cls.branchId !== selectedBranch) return false;
    if (selectedStatus !== 'all' && cls.status !== selectedStatus) return false;
    if (selectedSubject !== 'all' && cls.subjectId !== selectedSubject) return false;
    return true;
  });

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

  // Calculate statistics
  const stats = {
    total: classes.length,
    published: classes.filter(c => c.status === 'published').length,
    started: classes.filter(c => c.status === 'started').length,
    totalSeats: classes.reduce((sum, c) => sum + c.maxStudents, 0),
    enrolledSeats: classes.reduce((sum, c) => sum + c.enrolledCount, 0),
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">จัดการคลาสเรียน</h1>
          <p className="text-gray-600 mt-2">จัดการตารางเรียนและคลาสทั้งหมด</p>
        </div>
        <Link href="/classes/new">
          <Button className="bg-red-500 hover:bg-red-600">
            <Plus className="h-4 w-4 mr-2" />
            สร้างคลาสใหม่
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">คลาสทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">เปิดรับสมัคร</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.published}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">กำลังเรียน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.started}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ที่นั่งทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSeats}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">นักเรียนทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enrolledSeats}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="ค้นหาชื่อคลาส, รหัส, วิชา, ครู, สาขา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[200px]">
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

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="เลือกวิชา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกวิชา</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="เลือกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Classes Table */}
      <Card>
        <CardContent className="p-0">
          {filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {classes.length === 0 ? 'ยังไม่มีคลาสเรียน' : 'ไม่พบคลาสที่ตรงกับเงื่อนไข'}
              </h3>
              <p className="text-gray-600 mb-4">
                {classes.length === 0 ? 'เริ่มต้นด้วยการสร้างคลาสแรก' : 'ลองปรับเงื่อนไขการค้นหาใหม่'}
              </p>
              {classes.length === 0 && (
                <Link href="/classes/new">
                  <Button className="bg-red-500 hover:bg-red-600">
                    <Plus className="h-4 w-4 mr-2" />
                    สร้างคลาสใหม่
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>คลาส</TableHead>
                    <TableHead>วิชา</TableHead>
                    <TableHead>สาขา</TableHead>
                    <TableHead>ครู</TableHead>
                    <TableHead>วัน/เวลา</TableHead>
                    <TableHead className="text-center">ระยะเวลา</TableHead>
                    <TableHead className="text-center">นักเรียน</TableHead>
                    <TableHead className="text-right">ราคา</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.map((cls) => {
                    const isDeletable = cls.enrolledCount <= 0 || cls.status === 'cancelled';
                    
                    return (
                      <TableRow key={cls.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: getSubjectColor(cls.subjectId) }}
                            />
                            <div>
                              <div className="font-medium">{cls.name}</div>
                              <div className="text-sm text-gray-500">{cls.code}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getSubjectName(cls.subjectId)}</TableCell>
                        <TableCell>{getBranchName(cls.branchId)}</TableCell>
                        <TableCell>{getTeacherName(cls.teacherId)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">{cls.daysOfWeek.map(d => getDayName(d)).join(', ')}</div>
                            <div className="text-sm text-gray-500">{cls.startTime} - {cls.endTime}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div>
                            <div className="text-sm">{formatDate(cls.startDate)}</div>
                            <div className="text-sm text-gray-500">ถึง {formatDate(cls.endDate)}</div>
                            <div className="text-sm font-medium">{cls.totalSessions} ครั้ง</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cls.enrolledCount >= cls.maxStudents ? 'text-red-600 font-medium' : ''}>
                            {cls.enrolledCount}/{cls.maxStudents}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(cls.pricing.totalPrice)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            className={statusColors[cls.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700'}
                            variant={!cls.status ? 'destructive' : 'default'}
                          >
                            {statusLabels[cls.status as keyof typeof statusLabels] || 'ไม่ระบุ'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">เปิดเมนู</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/classes/${cls.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  ดูรายละเอียด
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/classes/${cls.id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  แก้ไข
                                </Link>
                              </DropdownMenuItem>
                              {isDeletable && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      ลบคลาส
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>ยืนยันการลบคลาส</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        คุณแน่ใจหรือไม่ที่จะลบคลาส &quot;{cls.name}&quot;? 
                                        การกระทำนี้ไม่สามารถยกเลิกได้
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteClass(cls.id, cls.name)}
                                        className="bg-red-500 hover:bg-red-600"
                                      >
                                        ลบคลาส
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
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
    </div>
  );
}