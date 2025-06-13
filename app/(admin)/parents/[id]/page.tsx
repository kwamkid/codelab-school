'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Parent, Student, Branch } from '@/types/models';
import { getParentWithStudents } from '@/lib/services/parents';
import { getBranch } from '@/lib/services/branches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Edit, 
  Phone, 
  Mail, 
  MapPin,
  Users,
  Plus,
  User,
  Cake,
  School,
  Home
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatDate, calculateAge } from '@/lib/utils';

export default function ParentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const parentId = params.id as string;
  
  const [parent, setParent] = useState<Parent | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [preferredBranch, setPreferredBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (parentId) {
      loadParentDetails();
    }
  }, [parentId]);

  const loadParentDetails = async () => {
    try {
      const { parent: parentData, students: studentsData } = await getParentWithStudents(parentId);
      
      if (!parentData) {
        toast.error('ไม่พบข้อมูลผู้ปกครอง');
        router.push('/parents');
        return;
      }
      
      setParent(parentData);
      setStudents(studentsData);
      
      // Load preferred branch if exists
      if (parentData.preferredBranchId) {
        const branch = await getBranch(parentData.preferredBranchId);
        setPreferredBranch(branch);
      }
    } catch (error) {
      console.error('Error loading parent details:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
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

  if (!parent) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">ไม่พบข้อมูลผู้ปกครอง</p>
        <Link href="/parents" className="text-red-500 hover:text-red-600 mt-4 inline-block">
          กลับไปหน้ารายการผู้ปกครอง
        </Link>
      </div>
    );
  }

  const activeStudents = students.filter(s => s.isActive);

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <Link 
          href="/parents" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          กลับไปหน้ารายการผู้ปกครอง
        </Link>
        
        <Link href={`/parents/${parentId}/edit`}>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            แก้ไขข้อมูล
          </Button>
        </Link>
      </div>

      {/* Parent Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4">
          {parent.pictureUrl ? (
            <img
              src={parent.pictureUrl}
              alt={parent.displayName}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
              <Users className="h-10 w-10 text-gray-500" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{parent.displayName}</h1>
            <div className="flex items-center gap-4 mt-2">
              {parent.lineUserId && (
                <Badge className="bg-green-100 text-green-700">
                  <img src="/line-icon.svg" alt="LINE" className="w-4 h-4 mr-1" />
                  เชื่อมต่อ LINE แล้ว
                </Badge>
              )}
              <span className="text-sm text-gray-500">
                ลงทะเบียนเมื่อ {formatDate(parent.createdAt, 'long')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลติดต่อ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {parent.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">เบอร์โทรหลัก</p>
                    <p>{parent.phone}</p>
                  </div>
                </div>
              )}
              
              {parent.emergencyPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-red-400" />
                  <div>
                    <p className="text-sm text-gray-500">เบอร์โทรฉุกเฉิน</p>
                    <p>{parent.emergencyPhone}</p>
                  </div>
                </div>
              )}
              
              {parent.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="break-all">{parent.email}</span>
                </div>
              )}
              
              {preferredBranch && (
                <div className="flex items-center gap-3 pt-3 border-t">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">สาขาหลัก</p>
                    <p>{preferredBranch.name}</p>
                  </div>
                </div>
              )}

              {parent.lastLoginAt && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-500">เข้าใช้งานล่าสุด</p>
                  <p className="text-sm">{formatDate(parent.lastLoginAt, 'long')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address Card */}
          {parent.address && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  ที่อยู่
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p>
                    {parent.address.houseNumber} 
                    {parent.address.street && ` ถ.${parent.address.street}`}
                  </p>
                  <p>
                    แขวง/ตำบล {parent.address.subDistrict}
                  </p>
                  <p>
                    เขต/อำเภอ {parent.address.district}
                  </p>
                  <p>
                    จังหวัด {parent.address.province} {parent.address.postalCode}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Students List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>ข้อมูลนักเรียน ({activeStudents.length})</CardTitle>
                <Link href={`/parents/${parentId}/students/new`}>
                  <Button size="sm" className="bg-red-500 hover:bg-red-600">
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มนักเรียน
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">ยังไม่มีข้อมูลนักเรียน</p>
                  <Link href={`/parents/${parentId}/students/new`}>
                    <Button className="bg-red-500 hover:bg-red-600">
                      <Plus className="h-4 w-4 mr-2" />
                      เพิ่มนักเรียนคนแรก
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {students.map((student) => (
                    <div 
                      key={student.id} 
                      className={`border rounded-lg p-4 ${!student.isActive ? 'opacity-60 bg-gray-50' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {student.profileImage ? (
                            <img
                              src={student.profileImage}
                              alt={student.name}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                              <User className="h-8 w-8 text-gray-500" />
                            </div>
                          )}
                          <div className="space-y-2">
                            <div>
                              <h4 className="font-semibold text-lg">
                                {student.nickname || student.name}
                              </h4>
                              <p className="text-sm text-gray-600">{student.name}</p>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Cake className="h-4 w-4 text-gray-400" />
                                <span>{formatDate(student.birthdate)} ({calculateAge(student.birthdate)} ปี)</span>
                              </div>
                              {student.schoolName && (
                                <div className="flex items-center gap-1">
                                  <School className="h-4 w-4 text-gray-400" />
                                  <span>{student.schoolName}</span>
                                  {student.gradeLevel && (
                                    <span className="text-gray-500">({student.gradeLevel})</span>
                                  )}
                                </div>
                              )}
                              <Badge variant={student.gender === 'M' ? 'secondary' : 'default'}>
                                {student.gender === 'M' ? 'ชาย' : 'หญิง'}
                              </Badge>
                              {!student.isActive && (
                                <Badge variant="destructive">ไม่ใช้งาน</Badge>
                              )}
                            </div>

                            {student.allergies && (
                              <div className="mt-2">
                                <span className="text-sm text-red-600">⚠️ แพ้: {student.allergies}</span>
                              </div>
                            )}

                            {student.specialNeeds && (
                              <div className="mt-1">
                                <span className="text-sm text-orange-600">📋 ความต้องการพิเศษ: {student.specialNeeds}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Link href={`/parents/${parentId}/students/${student.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                      
                      {/* Emergency Contact */}
                      {(student.emergencyContact || student.emergencyPhone) && (
                        <div className="mt-3 pt-3 border-t text-sm">
                          <p className="text-gray-500 mb-1">ติดต่อฉุกเฉิน</p>
                          <p>
                            {student.emergencyContact} 
                            {student.emergencyPhone && ` - ${student.emergencyPhone}`}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}