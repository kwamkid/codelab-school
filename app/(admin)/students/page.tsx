'use client';

import { useEffect, useState, useMemo } from 'react';
import { Student, Enrollment, Branch, Class } from '@/types/models';
import { getAllStudentsWithParents } from '@/lib/services/parents';
import { getActiveBranches } from '@/lib/services/branches';
import { getEnrollmentsByStudent } from '@/lib/services/enrollments';
import { getClasses } from '@/lib/services/classes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
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
import { useBranch } from '@/contexts/BranchContext';

type StudentWithInfo = Student & { 
  parentName: string; 
  parentPhone: string;
  enrollments?: Enrollment[];
  currentClasses?: string[];
  completedClasses?: string[];
  enrolledBranches?: string[];
};

const ITEMS_PER_PAGE = 20;

export default function StudentsPage() {
  const { selectedBranchId, isAllBranches } = useBranch();
  const [allStudentsData, setAllStudentsData] = useState<StudentWithInfo[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [branchMap, setBranchMap] = useState<Record<string, string>>({});
  const [classMap, setClassMap] = useState<Record<string, Class>>({});
  const [loading, setLoading] = useState(true);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [filterAllergy, setFilterAllergy] = useState<string>('all');
  const [filterEnrollment, setFilterEnrollment] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterGender, filterStatus, filterAllergy, filterEnrollment, selectedBranchId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load all necessary data in parallel
      const [branchesData, studentsData, classesData] = await Promise.all([
        getActiveBranches(),
        getAllStudentsWithParents(),
        getClasses()
      ]);
      
      setBranches(branchesData);
      setClasses(classesData);
      
      // Create maps for quick lookup
      const branchMapping: Record<string, string> = {};
      branchesData.forEach(branch => {
        branchMapping[branch.id] = branch.name;
      });
      setBranchMap(branchMapping);
      
      const classMapping: Record<string, Class> = {};
      classesData.forEach(cls => {
        classMapping[cls.id] = cls;
      });
      setClassMap(classMapping);
      
      // Set initial students data
      setAllStudentsData(studentsData);
      setLoading(false);
      
      // Load enrollment data for all students
      await loadAllEnrollmentData(studentsData, classMapping);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
      setLoading(false);
    }
  };

  const loadAllEnrollmentData = async (
    students: StudentWithInfo[],
    classMapping: Record<string, Class>
  ) => {
    try {
      setEnrollmentLoading(true);
      
      // Load enrollments for all students
      const studentsWithEnrollments = await Promise.all(
        students.map(async (student) => {
          try {
            const enrollments = await getEnrollmentsByStudent(student.id);
            
            // Process enrollment data
            const currentClasses: string[] = [];
            const completedClasses: string[] = [];
            const enrolledBranchIds = new Set<string>();
            
            enrollments.forEach(enrollment => {
              enrolledBranchIds.add(enrollment.branchId);
              
              const classData = classMapping[enrollment.classId];
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
      
      setAllStudentsData(studentsWithEnrollments);
      setEnrollmentLoading(false);
    } catch (error) {
      console.error('Error loading enrollment data:', error);
      setEnrollmentLoading(false);
    }
  };

  // Filter students based on criteria
  const filteredStudents = useMemo(() => {
    let filtered = [...allStudentsData];
    
    // Filter by selected branch if not viewing all branches
    if (!isAllBranches && selectedBranchId) {
      filtered = filtered.filter(student => 
        student.enrolledBranches?.includes(selectedBranchId) || false
      );
    }
    
    // Apply search filter
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
    
    // Apply gender filter
    if (filterGender !== 'all') {
      filtered = filtered.filter(student => student.gender === filterGender);
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(student => 
        filterStatus === 'active' ? student.isActive : !student.isActive
      );
    }
    
    // Apply allergy filter
    if (filterAllergy !== 'all') {
      filtered = filtered.filter(student => 
        filterAllergy === 'yes' ? !!student.allergies : !student.allergies
      );
    }
    
    // Apply enrollment filter
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
  }, [allStudentsData, searchTerm, filterGender, filterStatus, filterAllergy, filterEnrollment, selectedBranchId, isAllBranches, enrollmentLoading]);

  // Calculate statistics
  const stats = useMemo(() => {
    const studentsForStats = filteredStudents;
    
    const currentlyEnrolled = studentsForStats.filter(s => 
      (s.currentClasses?.length || 0) > 0
    ).length;
    
    const completedOnly = studentsForStats.filter(s => 
      (s.currentClasses?.length || 0) === 0 && (s.completedClasses?.length || 0) > 0
    ).length;
    
    const neverEnrolled = studentsForStats.filter(s => 
      (s.enrollments?.length || 0) === 0
    ).length;
    
    return {
      total: studentsForStats.length,
      active: studentsForStats.filter(s => s.isActive).length,
      male: studentsForStats.filter(s => s.gender === 'M').length,
      female: studentsForStats.filter(s => s.gender === 'F').length,
      withAllergies: studentsForStats.filter(s => s.allergies).length,
      currentlyEnrolled,
      completedOnly,
      neverEnrolled
    };
  }, [filteredStudents]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentStudents = filteredStudents.slice(startIndex, endIndex);

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          นักเรียนทั้งหมด
          {!isAllBranches && (
            <span className="text-red-600 text-lg ml-2">(เฉพาะสาขาที่เลือก)</span>
          )}
        </h1>
        <p className="text-gray-600 mt-2">
          {isAllBranches 
            ? 'รายชื่อนักเรียนทั้งหมดในระบบ' 
            : 'นักเรียนที่เคยเรียนหรือกำลังเรียนในสาขานี้'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {!isAllBranches && selectedBranchId ? 'นักเรียนในสาขา' : 'นักเรียนทั้งหมด'}
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
            <CardTitle className="text-sm font-medium">หมดคลาสแล้ว</CardTitle>
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
            <CardTitle className="text-sm font-medium">ยังไม่เคยเรียน</CardTitle>
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
            <SelectItem value="completed">หมดคลาสแล้ว</SelectItem>
            <SelectItem value="never">ยังไม่เคยเรียน</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              รายชื่อนักเรียน ({filteredStudents.length} คน)
            </CardTitle>
            {totalPages > 1 && (
              <div className="text-sm text-gray-500">
                หน้า {currentPage} จาก {totalPages}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ไม่พบข้อมูลนักเรียน
              </h3>
              <p className="text-gray-600">
                {searchTerm || filterGender !== 'all' || filterStatus !== 'active' || filterAllergy !== 'all' 
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
                      <TableHead className="min-w-[200px]">
                        {isAllBranches ? 'เรียนสาขา' : 'สถานะเรียน'}
                      </TableHead>
                      <TableHead className="text-right w-[60px]">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentStudents.map((student) => (
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
                          {isAllBranches ? (
                            // Show enrolled branches when viewing all branches
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
                                <span className="text-gray-400 text-sm">ยังไม่เคยเรียน</span>
                              )}
                            </div>
                          ) : (
                            // Show enrollment status when viewing specific branch
                            <div>
                              {enrollmentLoading ? (
                                <span className="text-gray-400 text-sm">กำลังโหลด...</span>
                              ) : student.currentClasses && student.currentClasses.length > 0 ? (
                                <div className="space-y-1">
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    <GraduationCap className="h-3 w-3 mr-1" />
                                    กำลังเรียน {student.currentClasses.length} คลาส
                                  </Badge>
                                  <div className="text-xs text-gray-500">
                                    {student.currentClasses.map(classId => 
                                      classMap[classId]?.name || classId
                                    ).join(', ')}
                                  </div>
                                </div>
                              ) : student.completedClasses && student.completedClasses.length > 0 ? (
                                <Badge className="bg-orange-100 text-orange-700 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  หมดคลาสแล้ว ({student.completedClasses.length} คลาส)
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-sm">ยังไม่เคยเรียน</span>
                              )}
                            </div>
                          )}
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 px-2">
                  <p className="text-sm text-gray-600">
                    แสดง {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} จาก {filteredStudents.length} รายการ
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

      {/* Allergies Details */}
      {currentStudents.some(s => s.allergies) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              รายละเอียดการแพ้อาหาร/ยา (หน้านี้)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentStudents
                .filter(s => s.allergies)
                .map(student => (
                  <div key={student.id} className="flex items-start gap-4 p-3 bg-red-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{student.nickname || student.name}</p>
                      <p className="text-sm text-red-600">แพ้: {student.allergies}</p>
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