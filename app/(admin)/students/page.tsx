'use client';

import { useEffect, useState } from 'react';
import { Student } from '@/types/models';
import { getAllStudentsWithParents } from '@/lib/services/parents';
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
  Users
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

type StudentWithParent = Student & { parentName: string; parentPhone: string };

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithParent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [filterAllergy, setFilterAllergy] = useState<string>('all');

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

    // Allergy filter
    const matchesAllergy = 
      filterAllergy === 'all' ||
      (filterAllergy === 'yes' && student.allergies) ||
      (filterAllergy === 'no' && !student.allergies);

    return matchesSearch && matchesGender && matchesStatus && matchesAllergy;
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายชื่อนักเรียน ({filteredStudents.length} คน)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead>ชื่อเล่น</TableHead>
                    <TableHead>อายุ</TableHead>
                    <TableHead>เพศ</TableHead>
                    <TableHead>โรงเรียน</TableHead>
                    <TableHead>ผู้ปกครอง</TableHead>
                    <TableHead>เบอร์ติดต่อ</TableHead>
                    <TableHead className="text-center">ประวัติแพ้</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} className={!student.isActive ? 'opacity-60' : ''}>
                      <TableCell>
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
                          <span className="font-medium">{student.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{student.nickname || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Cake className="h-3 w-3 text-gray-400" />
                          {calculateAge(student.birthdate)} ปี
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={student.gender === 'M' ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {student.gender === 'M' ? 'ชาย' : 'หญิง'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {student.schoolName ? (
                          <div className="flex items-center gap-1">
                            <School className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{student.schoolName}</span>
                            {student.gradeLevel && (
                              <span className="text-xs text-gray-500">({student.gradeLevel})</span>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Link 
                          href={`/parents/${student.parentId}`}
                          className="text-blue-600 hover:underline"
                        >
                          {student.parentName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {student.parentPhone}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {student.allergies ? (
                          <div className="flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {student.isActive ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">ใช้งาน</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">ไม่ใช้งาน</Badge>
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
          )}
        </CardContent>
      </Card>

      {/* Allergies Details Modal/Section - Optional */}
      {filteredStudents.some(s => s.allergies) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              รายละเอียดการแพ้อาหาร/ยา
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredStudents
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