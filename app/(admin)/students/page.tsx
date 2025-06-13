'use client';

import { useEffect, useState } from 'react';
import { Student } from '@/types/models';
import { getAllStudentsWithParents } from '@/lib/services/parents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  User,
  Cake,
  School,
  Phone,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, calculateAge } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StudentWithParent = Student & { parentName: string; parentPhone: string };

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithParent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const data = await getAllStudentsWithParents();
      setStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  // Filter students
  const filteredStudents = students.filter(student => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      student.name.toLowerCase().includes(searchLower) ||
      student.nickname.toLowerCase().includes(searchLower) ||
      student.parentName.toLowerCase().includes(searchLower) ||
      student.schoolName?.toLowerCase().includes(searchLower) ||
      false;

    // Gender filter
    const matchesGender = filterGender === 'all' || student.gender === filterGender;

    // Status filter
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && student.isActive) ||
      (filterStatus === 'inactive' && !student.isActive);

    return matchesSearch && matchesGender && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: students.length,
    active: students.filter(s => s.isActive).length,
    male: students.filter(s => s.gender === 'M').length,
    female: students.filter(s => s.gender === 'F').length,
    withAllergies: students.filter(s => s.allergies).length,
  };

  // Group by age
  const ageGroups = filteredStudents.reduce((acc, student) => {
    const age = calculateAge(student.birthdate);
    const group = age <= 6 ? '4-6 ปี' : age <= 9 ? '7-9 ปี' : age <= 12 ? '10-12 ปี' : '13+ ปี';
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
        <h1 className="text-3xl font-bold text-gray-900">นักเรียนทั้งหมด</h1>
        <p className="text-gray-600 mt-2">รายชื่อนักเรียนทั้งหมดในระบบ</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
              {((stats.male / stats.total) * 100).toFixed(0)}%
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
              {((stats.female / stats.total) * 100).toFixed(0)}%
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
            <CardTitle className="text-sm font-medium">ช่วงอายุ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(ageGroups).map(([group, count]) => (
                <div key={group} className="flex justify-between text-xs">
                  <span className="text-gray-600">{group}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
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
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายชื่อนักเรียน ({filteredStudents.length} คน)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ไม่พบข้อมูลนักเรียน
              </h3>
              <p className="text-gray-600">
                {searchTerm ? 'ลองค้นหาด้วยคำค้นอื่น' : 'ยังไม่มีนักเรียนในระบบ'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>นักเรียน</TableHead>
                    <TableHead>ข้อมูลส่วนตัว</TableHead>
                    <TableHead>โรงเรียน</TableHead>
                    <TableHead>ผู้ปกครอง</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                    <TableHead className="text-center">หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} className={!student.isActive ? 'opacity-60' : ''}>
                      <TableCell>
                        <Link 
                          href={`/parents/${student.parentId}`}
                          className="hover:text-red-600"
                        >
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
                              <p className="font-medium">
                                {student.nickname || student.name}
                              </p>
                              <p className="text-sm text-gray-500">{student.name}</p>
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Cake className="h-3 w-3 text-gray-400" />
                            <span>{formatDate(student.birthdate)}</span>
                            <Badge variant="outline" className="text-xs">
                              {calculateAge(student.birthdate)} ปี
                            </Badge>
                          </div>
                          <Badge 
                            variant={student.gender === 'M' ? 'secondary' : 'default'}
                            className="text-xs"
                          >
                            {student.gender === 'M' ? 'ชาย' : 'หญิง'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.schoolName ? (
                          <div className="flex items-center gap-1 text-sm">
                            <School className="h-3 w-3 text-gray-400" />
                            <span>{student.schoolName}</span>
                            {student.gradeLevel && (
                              <Badge variant="outline" className="text-xs ml-1">
                                {student.gradeLevel}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{student.parentName}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone className="h-3 w-3" />
                            {student.parentPhone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {student.isActive ? (
                          <Badge className="bg-green-100 text-green-700">ใช้งาน</Badge>
                        ) : (
                          <Badge variant="destructive">ไม่ใช้งาน</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {student.allergies && (
                          <div className="flex items-center justify-center">
                            <div className="group relative">
                              <AlertCircle className="h-4 w-4 text-red-500 cursor-help" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                แพ้: {student.allergies}
                              </div>
                            </div>
                          </div>
                        )}
                        {student.specialNeeds && !student.allergies && (
                          <Badge variant="outline" className="text-xs">
                            พิเศษ
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}