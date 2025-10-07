'use client';

import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Student, Enrollment, Branch, Class } from '@/types/models';
import { getAllStudentsWithParents } from '@/lib/services/parents';
import { getActiveBranches } from '@/lib/services/branches';
import { getEnrollmentsByStudent } from '@/lib/services/enrollments';
import { getClasses } from '@/lib/services/classes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { 
  Search, 
  User,
  Cake,
  School,
  Phone,
  AlertCircle,
  Edit,
  Users,
  Building2,
  GraduationCap,
  CheckCircle2,
  Globe
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { calculateAge } from '@/lib/utils';
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
import { Skeleton } from '@/components/ui/skeleton';

type StudentWithInfo = Student & { 
  parentName: string; 
  parentPhone: string;
  enrollments?: Enrollment[];
  currentClasses?: string[];
  completedClasses?: string[];
  enrolledBranches?: string[];
};

// Cache keys
const QUERY_KEYS = {
  students: ['students'],
  branches: ['branches', 'active'],
  classes: ['classes'],
};

export default function StudentsPage() {
  const [allStudentsData, setAllStudentsData] = useState<StudentWithInfo[]>([]);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [filterAllergy, setFilterAllergy] = useState<string>('all');
  const [filterEnrollment, setFilterEnrollment] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');

  // Pagination
  const {
    currentPage,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
    resetPagination,
    getPaginatedData,
    totalPages,
  } = usePagination(20);

  // React Query: Load students
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: QUERY_KEYS.students,
    queryFn: getAllStudentsWithParents,
    staleTime: 60000, // 1 minute
  });

  // React Query: Load branches
  const { data: branches = [] } = useQuery({
    queryKey: QUERY_KEYS.branches,
    queryFn: getActiveBranches,
    staleTime: 300000, // 5 minutes
  });

  // React Query: Load classes
  const { data: classes = [] } = useQuery({
    queryKey: QUERY_KEYS.classes,
    queryFn: getClasses,
    staleTime: 120000, // 2 minutes
  });

  // Create maps
  const branchMap = useMemo(() => {
    const map: Record<string, string> = {};
    branches.forEach(branch => {
      map[branch.id] = branch.name;
    });
    return map;
  }, [branches]);

  const classMap = useMemo(() => {
    const map: Record<string, Class> = {};
    classes.forEach(cls => {
      map[cls.id] = cls;
    });
    return map;
  }, [classes]);

  // Initialize students data
  useEffect(() => {
    if (students.length > 0) {
      setAllStudentsData(students);
    }
  }, [students]);

  // Reset page when filters change
  useMemo(() => {
    resetPagination();
  }, [searchTerm, filterGender, filterStatus, filterAllergy, filterEnrollment, filterBranch, resetPagination]);

  // Load enrollment data for current page only (Lazy Loading)
  useEffect(() => {
    if (paginatedStudents.length === 0) {
      setEnrollmentLoading(false);
      return;
    }

    const loadPageEnrollments = async () => {
      setEnrollmentLoading(true);
      
      try {
        const studentsWithEnrollments = await Promise.all(
          paginatedStudents.map(async (student) => {
            // Check if already loaded
            if (student.enrollments !== undefined) {
              return student;
            }

            try {
              const enrollments = await getEnrollmentsByStudent(student.id);
              
              const currentClasses: string[] = [];
              const completedClasses: string[] = [];
              const enrolledBranchIds = new Set<string>();
              
              enrollments.forEach(enrollment => {
                enrolledBranchIds.add(enrollment.branchId);
                
                const classData = classMap[enrollment.classId];
                if (classData) {
                  if (enrollment.status === 'active' && classData.status !== 'completed') {
                    currentClasses.push(enrollment.classId);
                  } else if (enrollment.status === 'completed' || classData.status === 'completed') {
                    completedClasses.push(enrollment.classId);
                  }
                }
              });
              
              return {
                ...student,
                enrollments,
                currentClasses,
                completedClasses,
                enrolledBranches: Array.from(enrolledBranchIds)
              };
            } catch (error) {
              console.error(`Error loading enrollments for student ${student.id}:`, error);
              return {
                ...student,
                enrollments: [],
                currentClasses: [],
                completedClasses: [],
                enrolledBranches: []
              };
            }
          })
        );

        // Update only the students on current page
        setAllStudentsData(prevData => {
          const newData = [...prevData];
          studentsWithEnrollments.forEach(updatedStudent => {
            const index = newData.findIndex(s => s.id === updatedStudent.id);
            if (index !== -1) {
              newData[index] = updatedStudent;
            }
          });
          return newData;
        });
        
        setEnrollmentLoading(false);
      } catch (error) {
        console.error('Error loading page enrollments:', error);
        setEnrollmentLoading(false);
      }
    };

    loadPageEnrollments();
  }, [paginatedStudents.map(s => s.id).join(','), classMap]);

  // Filter students
  const filteredStudents = useMemo(() => {
    let filtered = [...allStudentsData];
    
    if (filterBranch !== 'all') {
      filtered = filtered.filter(student => {
        const studiesInBranch = student.enrolledBranches?.includes(filterBranch) || false;
        return studiesInBranch;
      });
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(searchLower) ||
        student.nickname.toLowerCase().includes(searchLower) ||
        student.parentName.toLowerCase().includes(searchLower) ||
        student.schoolName?.toLowerCase().includes(searchLower) ||
        false
      );
    }
    
    if (filterGender !== 'all') {
      filtered = filtered.filter(student => student.gender === filterGender);
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(student => 
        filterStatus === 'active' ? student.isActive : !student.isActive
      );
    }
    
    if (filterAllergy !== 'all') {
      filtered = filtered.filter(student => 
        filterAllergy === 'yes' ? !!student.allergies : !student.allergies
      );
    }
    
    if (filterEnrollment !== 'all' && !enrollmentLoading) {
      filtered = filtered.filter(student => {
        const hasCurrentClasses = (student.currentClasses?.length || 0) > 0;
        const hasCompletedClasses = (student.completedClasses?.length || 0) > 0;
        const hasEnrollments = (student.enrollments?.length || 0) > 0;
        
        if (filterEnrollment === 'active') return hasCurrentClasses;
        if (filterEnrollment === 'completed') return !hasCurrentClasses && hasCompletedClasses;
        if (filterEnrollment === 'never') return !hasEnrollments;
        return true;
      });
    }
    
    return filtered;
  }, [allStudentsData, searchTerm, filterGender, filterStatus, filterAllergy, filterEnrollment, filterBranch, enrollmentLoading]);

  // Statistics
  const stats = useMemo(() => {
    const currentlyEnrolled = filteredStudents.filter(s => 
      (s.currentClasses?.length || 0) > 0
    ).length;
    
    const completedOnly = filteredStudents.filter(s => 
      (s.currentClasses?.length || 0) === 0 && (s.completedClasses?.length || 0) > 0
    ).length;
    
    const neverEnrolled = filteredStudents.filter(s => 
      (s.enrollments?.length || 0) === 0
    ).length;
    
    return {
      total: filteredStudents.length,
      active: filteredStudents.filter(s => s.isActive).length,
      male: filteredStudents.filter(s => s.gender === 'M').length,
      female: filteredStudents.filter(s => s.gender === 'F').length,
      withAllergies: filteredStudents.filter(s => s.allergies).length,
      currentlyEnrolled,
      completedOnly,
      neverEnrolled
    };
  }, [filteredStudents]);

  // Paginated data
  const paginatedStudents = getPaginatedData(filteredStudents);
  const calculatedTotalPages = totalPages(filteredStudents.length);

  // Loading state
  if (loadingStudents) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
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

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Globe className="h-8 w-8 text-blue-500" />
          นักเรียนทั้งหมด (ทุกสาขา)
        </h1>
        <p className="text-gray-600 mt-2">
          รายชื่อนักเรียนทั้งหมดในระบบ - สามารถกรองตามสาขาได้
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {filterBranch !== 'all' ? 'นักเรียนในสาขา' : 'นักเรียนทั้งหมด'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1">ใช้งาน {stats.active} คน</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">นักเรียนชาย</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.male}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.total > 0 ? ((stats.male / stats.total) * 100).toFixed(0) : 0}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">นักเรียนหญิง</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{stats.female}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.total > 0 ? ((stats.female / stats.total) * 100).toFixed(0) : 0}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">มีประวัติแพ้</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.withAllergies}</div>
            <p className="text-xs text-gray-500 mt-1">ต้องระวัง</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">กำลังเรียน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {enrollmentLoading ? '...' : stats.currentlyEnrolled}
            </div>
            <p className="text-xs text-gray-500 mt-1">มีคลาสเรียน</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">จบคอร์สแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {enrollmentLoading ? '...' : stats.completedOnly}
            </div>
            <p className="text-xs text-gray-500 mt-1">รอคลาสใหม่</p>
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
            <p className="text-xs text-gray-500 mt-1">รอลงทะเบียน</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="ค้นหาชื่อ, ชื่อเล่น, ผู้ปกครอง, โรงเรียน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
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
                  <span className="text-xs text-gray-500 ml-1">(เรียนในสาขา)</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={filterGender} onValueChange={setFilterGender}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกเพศ</SelectItem>
            <SelectItem value="M">ชาย</SelectItem>
            <SelectItem value="F">หญิง</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">ใช้งาน</SelectItem>
            <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
            <SelectItem value="all">ทั้งหมด</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterAllergy} onValueChange={setFilterAllergy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกคน</SelectItem>
            <SelectItem value="yes">มีประวัติแพ้</SelectItem>
            <SelectItem value="no">ไม่มีประวัติแพ้</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterEnrollment} onValueChange={setFilterEnrollment}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">สถานะเรียนทั้งหมด</SelectItem>
            <SelectItem value="active">มีคลาสเรียน</SelectItem>
            <SelectItem value="completed">จบคอร์สแล้ว</SelectItem>
            <SelectItem value="never">ยังไม่ลงคอร์ส</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              รายชื่อนักเรียน ({filteredStudents.length} คน)
              {filterBranch !== 'all' && (
                <span className="text-blue-600 text-base ml-2">
                  • กรองสาขา: {branchMap[filterBranch]} (เรียนในสาขา)
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {paginatedStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ไม่พบข้อมูลนักเรียน
              </h3>
              <p className="text-gray-600">
                {searchTerm || filterGender !== 'all' || filterStatus !== 'active' || filterAllergy !== 'all' || filterBranch !== 'all'
                  ? 'ลองปรับเงื่อนไขการค้นหา' 
                  : 'ยังไม่มีนักเรียนในระบบ'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">ข้อมูลนักเรียน</TableHead>
                      <TableHead className="w-[100px]">เพศ / อายุ</TableHead>
                      <TableHead className="w-[150px]">โรงเรียน</TableHead>
                      <TableHead className="w-[150px]">ผู้ปกครอง</TableHead>
                      <TableHead className="text-center w-[80px]">ประวัติแพ้</TableHead>
                      <TableHead className="min-w-[200px]">สาขาที่เรียน / สถานะ</TableHead>
                      <TableHead className="text-right w-[60px]">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((student) => (
                      <TableRow key={student.id} className={!student.isActive ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            {student.profileImage ? (
                              <img
                                src={student.profileImage}
                                alt={student.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-6 w-6 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-sm text-gray-600">{student.nickname || '-'}</p>
                              {!student.isActive && (
                                <Badge variant="destructive" className="text-xs mt-1">ไม่ใช้งาน</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge 
                              className={student.gender === 'M' 
                                ? 'bg-blue-100 text-blue-700 text-xs' 
                                : 'bg-pink-100 text-pink-700 text-xs'
                              }
                            >
                              {student.gender === 'M' ? 'ชาย' : 'หญิง'}
                            </Badge>
                            <p className="text-sm flex items-center gap-1">
                              <Cake className="h-3 w-3 text-gray-400" />
                              {calculateAge(student.birthdate)} ปี
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {student.schoolName ? (
                            <div>
                              <p className="text-sm font-medium flex items-center gap-1 truncate max-w-[150px]" title={student.schoolName}>
                                <School className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{student.schoolName}</span>
                              </p>
                              {student.gradeLevel && (
                                <p className="text-xs text-gray-500">{student.gradeLevel}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <Link 
                              href={`/parents/${student.parentId}`}
                              className="text-sm font-medium text-blue-600 hover:underline truncate block max-w-[140px]"
                              title={student.parentName}
                            >
                              {student.parentName}
                            </Link>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              {student.parentPhone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {student.allergies ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              มี
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1">
                              {enrollmentLoading ? (
                                <span className="text-gray-400 text-sm">กำลังโหลด...</span>
                              ) : student.enrolledBranches && student.enrolledBranches.length > 0 ? (
                                student.enrolledBranches.map(branchId => (
                                  <Badge 
                                    key={branchId} 
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {branchMap[branchId] || branchId}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </div>
                            
                            <div>
                              {enrollmentLoading ? (
                                <span className="text-gray-400 text-sm">กำลังโหลด...</span>
                              ) : student.currentClasses && student.currentClasses.length > 0 ? (
                                <div className="space-y-1">
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    <GraduationCap className="h-3 w-3 mr-1" />
                                    กำลังเรียน {student.currentClasses.length} คลาส
                                  </Badge>
                                  <div className="text-xs text-gray-500 max-w-[200px]">
                                    {student.currentClasses.map(classId => 
                                      classMap[classId]?.name || classId
                                    ).join(', ')}
                                  </div>
                                </div>
                              ) : student.completedClasses && student.completedClasses.length > 0 ? (
                                <Badge className="bg-orange-100 text-orange-700 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  จบคอร์สแล้ว ({student.completedClasses.length} คลาส)
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-sm">ยังไม่ลงคอร์ส</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/parents/${student.parentId}/students/${student.id}/edit`}>
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={calculatedTotalPages}
                pageSize={pageSize}
                totalItems={filteredStudents.length}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Allergies Details */}
      {paginatedStudents.some(s => s.allergies) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              รายละเอียดการแพ้อาหาร/ยา (หน้านี้)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paginatedStudents
                .filter(s => s.allergies)
                .map(student => (
                  <div key={student.id} className="flex items-start gap-4 p-3 bg-red-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{student.nickname || student.name}</p>
                      <p className="text-sm text-red-600">แพ้: {student.allergies}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {student.enrolledBranches?.map(branchId => (
                          <Badge 
                            key={branchId} 
                            variant="outline"
                            className="text-xs"
                          >
                            {branchMap[branchId] || branchId}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {student.specialNeeds && (
                      <Badge variant="outline" className="text-xs">
                        มีความต้องการพิเศษ
                      </Badge>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}