'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Parent, Student, Enrollment, Branch } from '@/types/models';
import { getParents, getStudentsByParent } from '@/lib/services/parents';
import { getActiveBranches } from '@/lib/services/branches';
import { getEnrollmentsByParent, getEnrollmentsByStudent } from '@/lib/services/enrollments';
import { getClasses } from '@/lib/services/classes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Users, 
  Phone, 
  Mail, 
  Eye, 
  Edit, 
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  User,
  Cake,
  School,
  GraduationCap,
  Globe
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
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
import { formatDate, calculateAge } from '@/lib/utils';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { ActionButton } from '@/components/ui/action-button';

interface StudentWithEnrollment extends Student {
  enrollments?: Enrollment[];
  hasActiveClass?: boolean;
  enrollmentStatus?: 'active' | 'completed' | 'never';
}

interface ParentWithInfo extends Parent {
  students?: StudentWithEnrollment[];
  activeStudentCount?: number;
  enrollmentStatus?: 'active' | 'completed' | 'never' | 'mixed';
}

const ITEMS_PER_PAGE = 20;

export default function ParentsPage() {
  const [allParentsData, setAllParentsData] = useState<ParentWithInfo[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [classes, setClasses] = useState<{ [key: string]: any }>({});
  const [branchMap, setBranchMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all'); // เพิ่ม branch filter
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInitialData();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterBranch, filterStatus]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load all necessary data
      const [branchesData, parentsData, classesData] = await Promise.all([
        getActiveBranches(),
        getParents(),
        getClasses()
      ]);
      
      setBranches(branchesData);
      
      // Create maps
      const branchMapping: Record<string, string> = {};
      branchesData.forEach(branch => {
        branchMapping[branch.id] = branch.name;
      });
      setBranchMap(branchMapping);
      
      const classMapping: Record<string, any> = {};
      classesData.forEach((cls: any) => {
        classMapping[cls.id] = cls;
      });
      setClasses(classMapping);
      
      // Set initial parents data
      setAllParentsData(parentsData);
      setLoading(false);
      
      // Load additional data
      await loadAllParentDetails(parentsData, classMapping);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
      setLoading(false);
    }
  };

  const loadAllParentDetails = async (parents: Parent[], classMapping: Record<string, any>) => {
    try {
      setEnrollmentLoading(true);
      
      // Load details for all parents
      const parentsWithDetails = await Promise.all(
        parents.map(async (parent) => {
          try {
            // Load students
            const students = await getStudentsByParent(parent.id);
            
            // Load enrollments for each student
            const studentsWithEnrollments = await Promise.all(
              students.map(async (student) => {
                const enrollments = await getEnrollmentsByStudent(student.id);
                
                // Check if student has active classes
                let hasActiveClass = false;
                let enrollmentStatus: 'active' | 'completed' | 'never' = 'never';
                
                if (enrollments.length > 0) {
                  const activeEnrollments = enrollments.filter(e => {
                    const cls = classMapping[e.classId];
                    return e.status === 'active' && cls && cls.status !== 'completed';
                  });
                  
                  hasActiveClass = activeEnrollments.length > 0;
                  enrollmentStatus = hasActiveClass ? 'active' : 'completed';
                }
                
                return {
                  ...student,
                  enrollments,
                  hasActiveClass,
                  enrollmentStatus
                };
              })
            );
            
            // Calculate parent enrollment status
            const activeCount = studentsWithEnrollments.filter(s => s.isActive).length;
            const statuses = studentsWithEnrollments.map(s => s.enrollmentStatus);
            
            let parentStatus: 'active' | 'completed' | 'never' | 'mixed' = 'never';
            if (statuses.includes('active')) {
              parentStatus = 'active';
            } else if (statuses.includes('completed')) {
              parentStatus = 'completed';
            } else if (statuses.length > 1 && new Set(statuses).size > 1) {
              parentStatus = 'mixed';
            }
            
            return {
              ...parent,
              students: studentsWithEnrollments,
              activeStudentCount: activeCount,
              enrollmentStatus: parentStatus
            };
          } catch (error) {
            console.error(`Error loading details for parent ${parent.id}:`, error);
            return {
              ...parent,
              students: [],
              activeStudentCount: 0,
              enrollmentStatus: 'never' as const
            };
          }
        })
      );
      
      setAllParentsData(parentsWithDetails);
      setEnrollmentLoading(false);
    } catch (error) {
      console.error('Error loading parent details:', error);
      setEnrollmentLoading(false);
    }
  };

  // Filter parents based on criteria
  const filteredParents = useMemo(() => {
    let filtered = [...allParentsData];
    
    // Filter by selected branch - รวมทั้งที่เรียนและสนใจ
    if (filterBranch !== 'all') {
      filtered = filtered.filter(parent => {
        // 1. มีลูกเรียนในสาขานี้
        const hasStudentInBranch = parent.students?.some(student => 
          student.enrollments?.some(e => e.branchId === filterBranch)
        );
        
        // 2. สนใจสาขานี้ (preferredBranchId)
        const interestedInBranch = parent.preferredBranchId === filterBranch;
        
        return hasStudentInBranch || interestedInBranch;
      });
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(parent => 
        parent.displayName.toLowerCase().includes(term) ||
        parent.phone?.toLowerCase().includes(term) ||
        parent.email?.toLowerCase().includes(term) ||
        parent.students?.some(s => 
          s.name.toLowerCase().includes(term) ||
          s.nickname.toLowerCase().includes(term)
        )
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all' && !enrollmentLoading) {
      filtered = filtered.filter(parent => {
        if (filterStatus === 'active') return parent.enrollmentStatus === 'active';
        if (filterStatus === 'completed') return parent.enrollmentStatus === 'completed' || parent.enrollmentStatus === 'mixed';
        if (filterStatus === 'never') return parent.enrollmentStatus === 'never';
        return true;
      });
    }
    
    return filtered;
  }, [allParentsData, searchTerm, filterBranch, filterStatus, enrollmentLoading]);

  // Calculate statistics
  const stats = useMemo(() => {
    const parentsForStats = filteredParents;
    
    const activeCount = parentsForStats.filter(p => p.enrollmentStatus === 'active').length;
    const completedCount = parentsForStats.filter(p => p.enrollmentStatus === 'completed' || p.enrollmentStatus === 'mixed').length;
    const neverCount = parentsForStats.filter(p => p.enrollmentStatus === 'never').length;
    
    return {
      totalParents: parentsForStats.length,
      totalStudents: parentsForStats.reduce((sum, p) => sum + (p.activeStudentCount || 0), 0),
      withLineId: parentsForStats.filter(p => p.lineUserId).length,
      activeEnrollment: activeCount,
      completedEnrollment: completedCount,
      neverEnrolled: neverCount
    };
  }, [filteredParents]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredParents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentParents = filteredParents.slice(startIndex, endIndex);

  // Toggle row expansion
  const toggleRow = (parentId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(parentId)) {
      newExpanded.delete(parentId);
    } else {
      newExpanded.add(parentId);
    }
    setExpandedRows(newExpanded);
  };

  // Pagination controls
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Globe className="h-8 w-8 text-blue-500" />
            จัดการผู้ปกครอง (ทุกสาขา)
          </h1>
          <p className="text-gray-600 mt-2">
            ข้อมูลผู้ปกครองและนักเรียนทั้งหมดในระบบ - สามารถกรองตามสาขาได้
          </p>
        </div>
        <PermissionGuard action="create">
          <Link href="/parents/new">
            <ActionButton action="create" className="bg-red-500 hover:bg-red-600">
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มผู้ปกครองใหม่
            </ActionButton>
          </Link>
        </PermissionGuard>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {filterBranch !== 'all' ? 'ผู้ปกครองในสาขา' : 'ผู้ปกครองทั้งหมด'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">นักเรียนทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalStudents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">เชื่อมต่อ LINE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.withLineId}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">มีลูกกำลังเรียน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {enrollmentLoading ? '...' : stats.activeEnrollment}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">จบคอร์สแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {enrollmentLoading ? '...' : stats.completedEnrollment}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ยังไม่ลงคอร์ส</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {enrollmentLoading ? '...' : stats.neverEnrolled}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="ค้นหาชื่อผู้ปกครอง, นักเรียน, เบอร์โทร, อีเมล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Branch Filter */}
        <Select value={filterBranch} onValueChange={setFilterBranch}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                ทุกสาขา
              </div>
            </SelectItem>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {branch.name}
                  <span className="text-xs text-gray-500 ml-1">(เรียน+สนใจ)</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">สถานะเรียนทั้งหมด</SelectItem>
            <SelectItem value="active">มีลูกกำลังเรียน</SelectItem>
            <SelectItem value="completed">จบคอร์สแล้ว</SelectItem>
            <SelectItem value="never">ยังไม่ลงคอร์ส</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Parents Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              รายชื่อผู้ปกครอง ({filteredParents.length} คน)
              {filterBranch !== 'all' && (
                <span className="text-blue-600 text-base ml-2">
                  • กรองสาขา: {branchMap[filterBranch]} (เรียน+สนใจ)
                </span>
              )}
            </CardTitle>
            {totalPages > 1 && (
              <div className="text-sm text-gray-500">
                หน้า {currentPage} จาก {totalPages}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentParents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 
                 filterBranch !== 'all' ? 'ไม่มีผู้ปกครองในสาขานี้' : 'ยังไม่มีผู้ปกครอง'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'ลองค้นหาด้วยคำค้นอื่น' : 
                 filterBranch !== 'all' ? 'ไม่มีผู้ปกครองที่เรียนหรือสนใจสาขานี้' : 'เริ่มต้นด้วยการเพิ่มผู้ปกครองคนแรก'}
              </p>
              {!searchTerm && filterBranch === 'all' && (
                <PermissionGuard action="create">
                  <Link href="/parents/new">
                    <ActionButton action="create" className="bg-red-500 hover:bg-red-600">
                      <Plus className="h-4 w-4 mr-2" />
                      เพิ่มผู้ปกครองใหม่
                    </ActionButton>
                  </Link>
                </PermissionGuard>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>ชื่อผู้ปกครอง</TableHead>
                      <TableHead>ติดต่อ</TableHead>
                      <TableHead className="text-center">จำนวนลูก</TableHead>
                      <TableHead className="text-center">LINE</TableHead>
                      <TableHead>สาขาที่สะดวก</TableHead>
                      <TableHead>สาขาที่เรียน</TableHead>
                      <TableHead>วันที่ลงทะเบียน</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentParents.map((parent) => (
                      <>
                        <TableRow key={parent.id} className="cursor-pointer hover:bg-gray-50" onClick={() => toggleRow(parent.id)}>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                              {expandedRows.has(parent.id) ? 
                                <ChevronUp className="h-4 w-4" /> : 
                                <ChevronDown className="h-4 w-4" />
                              }
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {parent.pictureUrl ? (
                                <img
                                  src={parent.pictureUrl}
                                  alt={parent.displayName}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <Users className="h-5 w-5 text-gray-500" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{parent.displayName}</p>
                                {enrollmentLoading ? (
                                  <p className="text-xs text-gray-500">กำลังโหลด...</p>
                                ) : parent.enrollmentStatus === 'active' ? (
                                  <Badge className="bg-green-100 text-green-700 text-xs">กำลังเรียน</Badge>
                                ) : parent.enrollmentStatus === 'completed' || parent.enrollmentStatus === 'mixed' ? (
                                  <Badge className="bg-orange-100 text-orange-700 text-xs">จบคอร์สแล้ว</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">ยังไม่ลงคอร์ส</Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {parent.phone && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3 w-3" />
                                  {parent.phone}
                                </div>
                              )}
                              {parent.email && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate max-w-[150px]" title={parent.email}>
                                    {parent.email}
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="space-y-1">
                              <Badge variant="secondary">
                                {parent.activeStudentCount || 0} คน
                              </Badge>
                              {parent.students && parent.students.length !== parent.activeStudentCount && (
                                <div className="text-xs text-gray-500">
                                  (ทั้งหมด {parent.students.length})
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {parent.lineUserId ? (
                              <Badge className="bg-green-100 text-green-700">
                                เชื่อมต่อแล้ว
                              </Badge>
                            ) : (
                              <Badge variant="outline">ยังไม่เชื่อมต่อ</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {parent.preferredBranchId ? (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline">
                                  {branchMap[parent.preferredBranchId] || parent.preferredBranchId}
                                </Badge>
                                <span className="text-xs text-blue-600">สนใจ</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {enrollmentLoading ? (
                                <span className="text-gray-400 text-sm">กำลังโหลด...</span>
                              ) : (() => {
                                // Get unique branches from student enrollments
                                const enrolledBranches = new Set<string>();
                                parent.students?.forEach(student => {
                                  student.enrollments?.forEach(enrollment => {
                                    enrolledBranches.add(enrollment.branchId);
                                  });
                                });
                                
                                return enrolledBranches.size > 0 ? (
                                  Array.from(enrolledBranches).map(branchId => (
                                    <Badge 
                                      key={branchId} 
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {branchMap[branchId] || branchId}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-sm">ยังไม่ลงคอร์ส</span>
                                );
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(parent.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Link href={`/parents/${parent.id}`} onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <PermissionGuard action="update">
                                <Link href={`/parents/${parent.id}/edit`} onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </PermissionGuard>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expandable row for students */}
                        {expandedRows.has(parent.id) && parent.students && parent.students.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-gray-50 p-0">
                              <div className="p-4">
                                <h4 className="font-medium text-sm mb-3">ข้อมูลนักเรียน</h4>
                                <div className="space-y-2">
                                  {parent.students.map((student) => (
                                    <div key={student.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                      <div className="flex items-center gap-3">
                                        {student.profileImage ? (
                                          <img
                                            src={student.profileImage}
                                            alt={student.name}
                                            className="w-10 h-10 rounded-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                            <User className="h-5 w-5 text-gray-500" />
                                          </div>
                                        )}
                                        <div>
                                          <p className="font-medium">{student.name}</p>
                                          <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <span>{student.nickname || '-'}</span>
                                            <Badge 
                                              className={student.gender === 'M' 
                                                ? 'bg-blue-100 text-blue-700 text-xs' 
                                                : 'bg-pink-100 text-pink-700 text-xs'
                                              }
                                            >
                                              {student.gender === 'M' ? 'ชาย' : 'หญิง'}
                                            </Badge>
                                            <span className="flex items-center gap-1">
                                              <Cake className="h-3 w-3" />
                                              {calculateAge(student.birthdate)} ปี
                                            </span>
                                            {student.schoolName && (
                                              <span className="flex items-center gap-1">
                                                <School className="h-3 w-3" />
                                                {student.schoolName}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {/* แสดงสาขาที่เรียน */}
                                        <div className="flex flex-wrap gap-1">
                                          {(() => {
                                            const studentBranches = new Set<string>();
                                            student.enrollments?.forEach(enrollment => {
                                              studentBranches.add(enrollment.branchId);
                                            });
                                            
                                            return studentBranches.size > 0 ? (
                                              Array.from(studentBranches).map(branchId => (
                                                <Badge 
                                                  key={branchId} 
                                                  variant="outline"
                                                  className="text-xs"
                                                >
                                                  {branchMap[branchId] || branchId}
                                                </Badge>
                                              ))
                                            ) : null;
                                          })()}
                                        </div>
                                        
                                        {!enrollmentLoading && (
                                          <>
                                            {student.enrollmentStatus === 'active' ? (
                                              <div className="space-y-1">
                                                <Badge className="bg-green-100 text-green-700 text-xs">
                                                  <GraduationCap className="h-3 w-3 mr-1" />
                                                  กำลังเรียน
                                                </Badge>
                                                {/* แสดงคลาสที่เรียนอยู่ */}
                                                {student.enrollments && student.enrollments.length > 0 && (
                                                  <div className="text-xs text-gray-600 max-w-[300px]">
                                                    {student.enrollments
                                                      .filter(e => e.status === 'active')
                                                      .map(e => classes[e.classId]?.name || e.classId)
                                                      .join(', ')}
                                                  </div>
                                                )}
                                              </div>
                                            ) : student.enrollmentStatus === 'completed' ? (
                                              <Badge className="bg-orange-100 text-orange-700 text-xs">
                                                จบคอร์สแล้ว
                                              </Badge>
                                            ) : (
                                              <Badge variant="secondary" className="text-xs">
                                                ยังไม่ลงคอร์ส
                                              </Badge>
                                            )}
                                          </>
                                        )}
                                        {!student.isActive && (
                                          <Badge variant="destructive" className="text-xs">ไม่ใช้งาน</Badge>
                                        )}
                                        <Link href={`/parents/${parent.id}/students/${student.id}/edit`}>
                                          <Button size="sm" variant="ghost">
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </Link>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="text-right mt-2">
                                    <Link href={`/parents/${parent.id}/students/new`}>
                                      <Button size="sm" variant="outline">
                                        <Plus className="h-4 w-4 mr-2" />
                                        เพิ่มนักเรียน
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 px-2">
                  <p className="text-sm text-gray-600">
                    แสดง {startIndex + 1}-{Math.min(endIndex, filteredParents.length)} จาก {filteredParents.length} รายการ
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={i}
                            variant={pageNum === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}