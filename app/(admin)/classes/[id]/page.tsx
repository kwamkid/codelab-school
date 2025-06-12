'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Class, Branch, Subject, Teacher, Room, ClassSchedule } from '@/types/models';
import { getClass, getClassSchedules, updateClass } from '@/lib/services/classes';
import { getBranch } from '@/lib/services/branches';
import { getSubject } from '@/lib/services/subjects';
import { getTeacher } from '@/lib/services/teachers';
import { getRoom } from '@/lib/services/rooms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock, 
  Users, 
  MapPin,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatDate, formatCurrency, getDayName } from '@/lib/utils';
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

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  
  const [classData, setClassData] = useState<Class | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (classId) {
      loadClassDetails();
    }
  }, [classId]);

  const loadClassDetails = async () => {
    try {
      const classInfo = await getClass(classId);
      if (!classInfo) {
        toast.error('ไม่พบข้อมูลคลาส');
        router.push('/classes');
        return;
      }
      
      setClassData(classInfo);
      
      // Load related data
      const [branchData, subjectData, teacherData, roomData, schedulesData] = await Promise.all([
        getBranch(classInfo.branchId),
        getSubject(classInfo.subjectId),
        getTeacher(classInfo.teacherId),
        getRoom(classInfo.branchId, classInfo.roomId),
        getClassSchedules(classId)
      ]);
      
      setBranch(branchData);
      setSubject(subjectData);
      setTeacher(teacherData);
      setRoom(roomData);
      setSchedules(schedulesData);
    } catch (error) {
      console.error('Error loading class details:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!classData) return;
    
    // Check if class has enrolled students
    if (classData.enrolledCount > 0) {
      toast.error('ไม่สามารถลบคลาสที่มีนักเรียนลงทะเบียนแล้ว');
      return;
    }
    
    setDeleting(true);
    try {
      // Update status to cancelled instead of hard delete
      await updateClass(classId, { status: 'cancelled' });
      toast.success('ยกเลิกคลาสเรียบร้อยแล้ว');
      router.push('/classes');
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('ไม่สามารถยกเลิกคลาสได้');
    } finally {
      setDeleting(false);
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

  if (!classData || !branch || !subject || !teacher || !room) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">ไม่พบข้อมูลคลาส</p>
        <Link href="/classes" className="text-red-500 hover:text-red-600 mt-4 inline-block">
          กลับไปหน้ารายการคลาส
        </Link>
      </div>
    );
  }

  const isEditable = classData.status === 'draft' || classData.status === 'published';
  const isDeletable = classData.status === 'draft' && classData.enrolledCount === 0;

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <Link 
          href="/classes" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          กลับไปหน้ารายการคลาส
        </Link>
        
        <div className="flex gap-2">
          {isEditable && (
            <Link href={`/classes/${classId}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                แก้ไข
              </Button>
            </Link>
          )}
          
          {isDeletable && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  ลบคลาส
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันการลบคลาส</AlertDialogTitle>
                  <AlertDialogDescription>
                    คุณแน่ใจหรือไม่ที่จะลบคลาส "{classData.name}"? 
                    การกระทำนี้ไม่สามารถยกเลิกได้
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                    ลบคลาส
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {!isDeletable && classData.status !== 'cancelled' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  ยกเลิกคลาส
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันการยกเลิกคลาส</AlertDialogTitle>
                  <AlertDialogDescription>
                    คุณแน่ใจหรือไม่ที่จะยกเลิกคลาส "{classData.name}"? 
                    {classData.enrolledCount > 0 && (
                      <span className="block mt-2 text-red-600">
                        คลาสนี้มีนักเรียน {classData.enrolledCount} คน
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ไม่ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                    ยืนยันยกเลิกคลาส
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Class Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: subject.color }}
              />
              {classData.name}
            </h1>
            <p className="text-gray-600 mt-2">รหัสคลาส: {classData.code}</p>
          </div>
          <Badge className={statusColors[classData.status as keyof typeof statusColors]}>
            {statusLabels[classData.status as keyof typeof statusLabels]}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลทั่วไป</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">วิชา</p>
                  <p className="font-medium">{subject.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ระดับ</p>
                  <p className="font-medium">{subject.level}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">สาขา</p>
                  <p className="font-medium">{branch.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ห้องเรียน</p>
                  <p className="font-medium">{room.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ครูผู้สอน</p>
                  <p className="font-medium">{teacher.nickname || teacher.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">จำนวนนักเรียน</p>
                  <p className="font-medium">
                    {classData.enrolledCount}/{classData.maxStudents} คน
                    {classData.enrolledCount >= classData.maxStudents && (
                      <span className="text-red-600 text-sm ml-2">(เต็ม)</span>
                    )}
                  </p>
                </div>
              </div>
              
              {classData.description && (
                <div>
                  <p className="text-sm text-gray-500">คำอธิบาย</p>
                  <p className="mt-1">{classData.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule Information */}
          <Card>
            <CardHeader>
              <CardTitle>ตารางเรียน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">วันที่เรียน</p>
                  <p className="font-medium">
                    {classData.daysOfWeek.map(d => getDayName(d)).join(', ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">เวลาเรียน</p>
                  <p className="font-medium">{classData.startTime} - {classData.endTime} น.</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">วันเริ่มเรียน</p>
                  <p className="font-medium">{formatDate(classData.startDate, 'long')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">วันจบ</p>
                  <p className="font-medium">{formatDate(classData.endDate, 'long')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">จำนวนครั้ง</p>
                  <p className="font-medium">{classData.totalSessions} ครั้ง</p>
                </div>
              </div>

              {/* Sessions List */}
              <div className="mt-6">
                <h4 className="font-medium mb-3">รายละเอียดแต่ละครั้ง</h4>
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">ครั้งที่</TableHead>
                        <TableHead>วันที่</TableHead>
                        <TableHead>เวลา</TableHead>
                        <TableHead>สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedules.map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell className="text-center">{schedule.sessionNumber}</TableCell>
                          <TableCell>{formatDate(schedule.sessionDate, 'long')}</TableCell>
                          <TableCell>{classData.startTime} - {classData.endTime}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={schedule.status === 'completed' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {schedule.status === 'scheduled' && 'รอเรียน'}
                              {schedule.status === 'completed' && 'เรียนแล้ว'}
                              {schedule.status === 'cancelled' && 'ยกเลิก'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Info */}
        <div className="space-y-6">
          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลราคา</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">ราคาคลาส</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(classData.pricing.totalPrice)}
                </p>
                <p className="text-sm text-gray-500">
                  ({formatCurrency(classData.pricing.pricePerSession)}/ครั้ง)
                </p>
              </div>
              
              {classData.pricing.materialFee > 0 && (
                <div>
                  <p className="text-sm text-gray-500">ค่าอุปกรณ์</p>
                  <p className="font-medium">{formatCurrency(classData.pricing.materialFee)}</p>
                </div>
              )}
              
              {classData.pricing.registrationFee > 0 && (
                <div>
                  <p className="text-sm text-gray-500">ค่าลงทะเบียน</p>
                  <p className="font-medium">{formatCurrency(classData.pricing.registrationFee)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>การจัดการ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={`/classes/${classId}/students`} className="block">
                <Button className="w-full" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  จัดการนักเรียน ({classData.enrolledCount})
                </Button>
              </Link>
              
              <Link href={`/classes/${classId}/attendance`} className="block">
                <Button className="w-full" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  เช็คชื่อเข้าเรียน
                </Button>
              </Link>
              
              <Button className="w-full" variant="outline" disabled>
                <DollarSign className="h-4 w-4 mr-2" />
                รายงานการชำระเงิน
              </Button>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อกำหนด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">นักเรียนขั้นต่ำ</span>
                <span className="font-medium">{classData.minStudents} คน</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">นักเรียนสูงสุด</span>
                <span className="font-medium">{classData.maxStudents} คน</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ช่วงอายุ</span>
                <span className="font-medium">{subject.ageRange.min}-{subject.ageRange.max} ปี</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}