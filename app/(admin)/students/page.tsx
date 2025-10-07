'use client';

import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Student, Branch } from '@/types/models';
import { getAllStudentsWithParents } from '@/lib/services/parents';
import { getActiveBranches } from '@/lib/services/branches';
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
  Globe
} from 'lucide-react';
import Link from 'next/link';
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
};

// Cache keys
const QUERY_KEYS = {
  students: ['students'],
  branches: ['branches', 'active'],
};

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [filterAllergy, setFilterAllergy] = useState<string>('all');

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

  // React Query: Load students only (super fast!)
  const { data: students = [], isLoading: loadingStudents } = useQuery<StudentWithInfo[]>({
    queryKey: QUERY_KEYS.students,
    queryFn: getAllStudentsWithParents,
    staleTime: 60000, // 1 minute
  });

  // React Query: Load branches (optional, for future use)
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: QUERY_KEYS.branches,
    queryFn: getActiveBranches,
    staleTime: 300000, // 5 minutes
  });

  // Reset page when filters change
  useEffect(() => {
    resetPagination();
  }, [searchTerm, filterGender, filterStatus, filterAllergy, resetPagination]);

  // Filter students (no enrollment data needed)
  const filteredStudents = useMemo(() => {
    let filtered = [...students];
    
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
    
    return filtered;
  }, [students, searchTerm, filterGender, filterStatus, filterAllergy]);

  // Paginated data
  const paginatedStudents = useMemo(() => {
    return getPaginatedData(filteredStudents);
  }, [filteredStudents, currentPage, pageSize, getPaginatedData]);

  // Statistics (simple, no enrollment data)
  const stats = useMemo(() => {
    return {
      total: filteredStudents.length,
      active: filteredStudents.filter(s => s.isActive).length,
      male: filteredStudents.filter(s => s.gender === 'M').length,
      female: filteredStudents.filter(s => s.gender === 'F').length,
      withAllergies: filteredStudents.filter(s => s.allergies).length,
    };
  }, [filteredStudents]);

  const calculatedTotalPages = totalPages(filteredStudents.length);

  // Loading state
  if (loadingStudents) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
          นักเรียนทั้งหมด
        </h1>
        <p className="text-gray-600 mt-2">
          รายชื่อนักเรียนทั้งหมดในระบบ
        </p>
      </div>

      {/* Summary Cards - Simple Stats Only */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">นักเรียนทั้งหมด</CardTitle>
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
      </div>

      {/* Filters - Simplified */}
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
      </div>

      {/* Students Table - Simple Columns Only */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              รายชื่อนักเรียน ({filteredStudents.length} คน)
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
                      <TableHead className="min-w-[200px]">ข้อมูลนักเรียน</TableHead>
                      <TableHead className="w-[120px]">เพศ / อายุ</TableHead>
                      <TableHead className="w-[180px]">โรงเรียน</TableHead>
                      <TableHead className="w-[180px]">ผู้ปกครอง</TableHead>
                      <TableHead className="text-center w-[100px]">ประวัติแพ้</TableHead>
                      <TableHead className="text-right w-[80px]">จัดการ</TableHead>
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
                                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <User className="h-6 w-6 text-gray-500" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium truncate">{student.name}</p>
                              <p className="text-sm text-gray-600 truncate">{student.nickname || '-'}</p>
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
                              <p className="text-sm font-medium flex items-center gap-1" title={student.schoolName}>
                                <School className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{student.schoolName}</span>
                              </p>
                              {student.gradeLevel && (
                                <p className="text-xs text-gray-500 truncate">{student.gradeLevel}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <Link 
                              href={`/parents/${student.parentId}`}
                              className="text-sm font-medium text-blue-600 hover:underline block truncate"
                              title={student.parentName}
                            >
                              {student.parentName}
                            </Link>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{student.parentPhone}</span>
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
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{student.nickname || student.name}</p>
                      <p className="text-sm text-red-600">แพ้: {student.allergies}</p>
                    </div>
                    {student.specialNeeds && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">
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