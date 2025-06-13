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
  Edit
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
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
      </div>

      {/* Students List */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium mb-3">รายชื่อนักเรียน ({filteredStudents.length} คน)</h3>
        
        {filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ไม่พบข้อมูลนักเรียน
              </h3>
              <p className="text-gray-600">
                {searchTerm ? 'ลองค้นหาด้วยคำค้นอื่น' : 'ยังไม่มีนักเรียนในระบบ'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredStudents.map((student) => (
              <Card key={student.id} className={!student.isActive ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Profile Picture */}
                    <div className="flex-shrink-0">
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
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <Link 
                            href={`/parents/${student.parentId}`}
                            className="font-medium text-gray-900 hover:text-red-600"
                          >
                            {student.nickname || student.name}
                          </Link>
                          {student.nickname && (
                            <span className="text-sm text-gray-500 ml-2">({student.name})</span>
                          )}
                        </div>
                        <Link href={`/parents/${student.parentId}/students/${student.id}/edit`}>
                          <Button size="sm" variant="ghost" className="h-8 px-2">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-1 gap-x-4 text-sm">
                        {/* Column 1 */}
                        <div className="flex items-center gap-1 text-gray-600">
                          <Cake className="h-3 w-3" />
                          <span>{formatDate(student.birthdate)}</span>
                          <Badge variant="outline" className="text-xs ml-1">
                            {calculateAge(student.birthdate)} ปี
                          </Badge>
                        </div>

                        {/* Column 2 */}
                        <div className="flex items-center gap-1 text-gray-600">
                          <User className="h-3 w-3" />
                          <span>ผู้ปกครอง: {student.parentName}</span>
                        </div>

                        {/* Column 3 */}
                        {student.schoolName && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <School className="h-3 w-3" />
                            <span>{student.schoolName}</span>
                            {student.gradeLevel && (
                              <span className="text-gray-500">({student.gradeLevel})</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Tags Row */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge 
                          variant={student.gender === 'M' ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {student.gender === 'M' ? 'ชาย' : 'หญิง'}
                        </Badge>
                        
                        {student.isActive ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">ใช้งาน</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">ไม่ใช้งาน</Badge>
                        )}

                        {student.allergies && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-red-500" />
                            <span className="text-xs text-red-600">แพ้: {student.allergies}</span>
                          </div>
                        )}

                        {student.specialNeeds && (
                          <Badge variant="outline" className="text-xs">
                            ความต้องการพิเศษ
                          </Badge>
                        )}

                        <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                          <Phone className="h-3 w-3" />
                          {student.parentPhone}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}