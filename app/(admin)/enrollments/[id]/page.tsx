'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Enrollment, Class, Student, Parent, Branch, Subject, Teacher } from '@/types/models';
import { getEnrollment, cancelEnrollment } from '@/lib/services/enrollments';
import { getClass } from '@/lib/services/classes';
import { getParent, getStudent } from '@/lib/services/parents';
import { getBranch } from '@/lib/services/branches';
import { getSubject } from '@/lib/services/subjects';
import { getTeacher } from '@/lib/services/teachers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Edit, 
  Printer,
  DollarSign,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  School,
  Phone,
  Mail,
  AlertCircle,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatDate, formatCurrency, getDayName, calculateAge } from '@/lib/utils';
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
import { Textarea } from '@/components/ui/textarea';

const statusColors = {
  'active': 'bg-green-100 text-green-700',
  'completed': 'bg-gray-100 text-gray-700',
  'dropped': 'bg-red-100 text-red-700',
  'transferred': 'bg-blue-100 text-blue-700',
};

const statusLabels = {
  'active': 'กำลังเรียน',
  'completed': 'จบแล้ว',
  'dropped': 'ยกเลิก',
  'transferred': 'ย้ายคลาส',
};

const paymentStatusColors = {
  'pending': 'bg-yellow-100 text-yellow-700',
  'partial': 'bg-orange-100 text-orange-700',
  'paid': 'bg-green-100 text-green-700',
};

const paymentStatusLabels = {
  'pending': 'รอชำระ',
  'partial': 'ชำระบางส่วน',
  'paid': 'ชำระแล้ว',
};

const paymentMethodLabels = {
  'cash': 'เงินสด',
  'transfer': 'โอนเงิน',
  'credit': 'บัตรเครดิต',
};

export default function EnrollmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const enrollmentId = params.id as string;
  
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [classData, setClassData] = useState<Class | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [parent, setParent] = useState<Parent | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (enrollmentId) {
      loadEnrollmentDetails();
    }
  }, [enrollmentId]);

  const loadEnrollmentDetails = async () => {
    try {
      const enrollmentData = await getEnrollment(enrollmentId);
      if (!enrollmentData) {
        toast.error('ไม่พบข้อมูลการลงทะเบียน');
        router.push('/enrollments');
        return;
      }
      
      setEnrollment(enrollmentData);
      
      // Load all related data
      const [classInfo, parentInfo, studentInfo] = await Promise.all([
        getClass(enrollmentData.classId),
        getParent(enrollmentData.parentId),
        getStudent(enrollmentData.parentId, enrollmentData.studentId)
      ]);
      
      if (!classInfo || !parentInfo || !studentInfo) {
        toast.error('ไม่สามารถโหลดข้อมูลที่เกี่ยวข้องได้');
        return;
      }
      
      setClassData(classInfo);
      setParent(parentInfo);
      setStudent(studentInfo);
      
      // Load additional data
      const [branchInfo, subjectInfo, teacherInfo] = await Promise.all([
        getBranch(classInfo.branchId),
        getSubject(classInfo.subjectId),
        getTeacher(classInfo.teacherId)
      ]);
      
      setBranch(branchInfo);
      setSubject(subjectInfo);
      setTeacher(teacherInfo);
    } catch (error) {
      console.error('Error loading enrollment details:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEnrollment = async () => {
    if (!cancelReason.trim()) {
      toast.error('กรุณาระบุเหตุผลในการยกเลิก');
      return;
    }
    
    setCancelling(true);
    try {
      await cancelEnrollment(enrollmentId, cancelReason);
      toast.success('ยกเลิกการลงทะเบียนเรียบร้อยแล้ว');
      loadEnrollmentDetails(); // Reload data
    } catch (error) {
      console.error('Error cancelling enrollment:', error);
      toast.error('ไม่สามารถยกเลิกการลงทะเบียนได้');
    } finally {
      setCancelling(false);
      setCancelReason('');
    }
  };

  const handlePrintReceipt = () => {
    // TODO: Implement print receipt
    toast.info('ฟังก์ชันพิมพ์ใบเสร็จจะเพิ่มในภายหลัง');
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

  if (!enrollment || !classData || !student || !parent) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">ไม่พบข้อมูลการลงทะเบียน</p>
        <Link href="/enrollments" className="text-red-500 hover:text-red-600 mt-4 inline-block">
          กลับไปหน้ารายการลงทะเบียน
        </Link>
      </div>
    );
  }

  const isActive = enrollment.status === 'active';

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <Link 
          href="/enrollments" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          กลับไปหน้ารายการลงทะเบียน
        </Link>
        
        <div className="flex gap-2">
          {enrollment.payment.status === 'paid' && (
            <Button variant="outline" onClick={handlePrintReceipt}>
              <Printer className="h-4 w-4 mr-2" />
              พิมพ์ใบเสร็จ
            </Button>
          )}
          
          {isActive && (
            <>
              <Link href={`/enrollments/${enrollmentId}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  แก้ไข
                </Button>
              </Link>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-600">
                    <XCircle className="h-4 w-4 mr-2" />
                    ยกเลิกการลงทะเบียน
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>ยืนยันการยกเลิก</AlertDialogTitle>
                    <AlertDialogDescription>
                      คุณแน่ใจหรือไม่ที่จะยกเลิกการลงทะเบียนของ {student.nickname} ({student.name})?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="my-4">
                    <label className="text-sm font-medium">เหตุผลในการยกเลิก</label>
                    <Textarea
                      placeholder="กรุณาระบุเหตุผล..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ไม่ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleCancelEnrollment}
                      className="bg-red-500 hover:bg-red-600"
                      disabled={cancelling || !cancelReason.trim()}
                    >
                      {cancelling ? 'กำลังยกเลิก...' : 'ยืนยันการยกเลิก'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">รายละเอียดการลงทะเบียน</h1>
            <p className="text-gray-600 mt-2">วันที่ลงทะเบียน: {formatDate(enrollment.enrolledAt, 'long')}</p>
          </div>
          <Badge className={statusColors[enrollment.status]}>
            {statusLabels[enrollment.status]}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                ข้อมูลนักเรียน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">ชื่อ-นามสกุล</p>
                  <p className="font-medium">{student.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ชื่อเล่น</p>
                  <p className="font-medium">{student.nickname}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">อายุ</p>
                  <p className="font-medium">{calculateAge(student.birthdate)} ปี</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">เพศ</p>
                  <p className="font-medium">{student.gender === 'M' ? 'ชาย' : 'หญิง'}</p>
                </div>
                {student.schoolName && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">โรงเรียน</p>
                      <p className="font-medium">{student.schoolName}</p>
                    </div>
                    {student.gradeLevel && (
                      <div>
                        <p className="text-sm text-gray-500">ระดับชั้น</p>
                        <p className="font-medium">{student.gradeLevel}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {(student.allergies || student.specialNeeds) && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  {student.allergies && (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-600">ประวัติการแพ้</p>
                        <p className="text-sm">{student.allergies}</p>
                      </div>
                    </div>
                  )}
                  {student.specialNeeds && (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-orange-600">ความต้องการพิเศษ</p>
                        <p className="text-sm">{student.specialNeeds}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parent Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                ข้อมูลผู้ปกครอง
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">ชื่อผู้ปกครอง</p>
                  <p className="font-medium">{parent.displayName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">เบอร์โทรหลัก</p>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">{parent.phone}</p>
                  </div>
                </div>
                {parent.emergencyPhone && (
                  <div>
                    <p className="text-sm text-gray-500">เบอร์โทรฉุกเฉิน</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-red-400" />
                      <p className="font-medium">{parent.emergencyPhone}</p>
                    </div>
                  </div>
                )}
                {parent.email && (
                  <div>
                    <p className="text-sm text-gray-500">อีเมล</p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <p className="font-medium">{parent.email}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {parent.lineUserId && (
                <div className="mt-4 pt-4 border-t">
                  <Badge className="bg-green-100 text-green-700">
                    <img src="/line-icon.svg" alt="LINE" className="w-4 h-4 mr-1" />
                    เชื่อมต่อ LINE แล้ว
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Class Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                ข้อมูลคลาสเรียน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">ชื่อคลาส</p>
                  <p className="font-medium text-lg">{classData.name}</p>
                  <p className="text-sm text-gray-500">รหัส: {classData.code}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">วิชา</p>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: subject?.color }}
                      />
                      <p className="font-medium">{subject?.name}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ระดับ</p>
                    <p className="font-medium">{subject?.level}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ครูผู้สอน</p>
                    <p className="font-medium">{teacher?.nickname || teacher?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">สาขา</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <p className="font-medium">{branch?.name}</p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-2">ตารางเรียน</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{classData.daysOfWeek.map(d => getDayName(d)).join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{classData.startTime} - {classData.endTime} น.</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(classData.startDate)} ถึง {formatDate(classData.endDate)}
                      <span className="ml-2">({classData.totalSessions} ครั้ง)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                ข้อมูลการชำระเงิน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">สถานะ</span>
                  <Badge className={paymentStatusColors[enrollment.payment.status]}>
                    {paymentStatusLabels[enrollment.payment.status]}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">ค่าเรียนปกติ</span>
                    <span>{formatCurrency(enrollment.pricing.originalPrice)}</span>
                  </div>
                  
                  {enrollment.pricing.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="text-sm">
                        ส่วนลด 
                        {enrollment.pricing.discountType === 'percentage' 
                          ? ` (${enrollment.pricing.discount}%)`
                          : ''
                        }
                      </span>
                      <span>-{formatCurrency(
                        enrollment.pricing.discountType === 'percentage'
                          ? enrollment.pricing.originalPrice * (enrollment.pricing.discount / 100)
                          : enrollment.pricing.discount
                      )}</span>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t flex justify-between font-semibold">
                    <span>ยอดที่ต้องชำระ</span>
                    <span className="text-lg">{formatCurrency(enrollment.pricing.finalPrice)}</span>
                  </div>
                  
                  {enrollment.payment.paidAmount > 0 && (
                    <>
                      <div className="pt-2 border-t flex justify-between">
                        <span className="text-sm text-gray-500">ชำระแล้ว</span>
                        <span className="text-green-600">
                          {formatCurrency(enrollment.payment.paidAmount)}
                        </span>
                      </div>
                      
                      {enrollment.payment.paidAmount < enrollment.pricing.finalPrice && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">คงเหลือ</span>
                          <span className="text-red-600">
                            {formatCurrency(enrollment.pricing.finalPrice - enrollment.payment.paidAmount)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <div className="pt-4 border-t space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">วิธีการชำระเงิน</p>
                    <p className="font-medium">
                      {paymentMethodLabels[enrollment.payment.method]}
                    </p>
                  </div>
                  
                  {enrollment.payment.paidDate && (
                    <div>
                      <p className="text-sm text-gray-500">วันที่ชำระ</p>
                      <p className="font-medium">
                        {formatDate(enrollment.payment.paidDate, 'long')}
                      </p>
                    </div>
                  )}
                  
                  {enrollment.payment.receiptNumber && (
                    <div>
                      <p className="text-sm text-gray-500">เลขที่ใบเสร็จ</p>
                      <p className="font-medium">{enrollment.payment.receiptNumber}</p>
                    </div>
                  )}
                  
                  {enrollment.pricing.promotionCode && (
                    <div>
                      <p className="text-sm text-gray-500">รหัสโปรโมชั่น</p>
                      <p className="font-medium">{enrollment.pricing.promotionCode}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Information */}
          {enrollment.status === 'dropped' && enrollment.droppedReason && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">ข้อมูลการยกเลิก</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{enrollment.droppedReason}</p>
              </CardContent>
            </Card>
          )}
          
          {enrollment.status === 'transferred' && enrollment.transferredFrom && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-600">ข้อมูลการย้ายคลาส</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">ย้ายมาจากคลาส: {enrollment.transferredFrom}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}