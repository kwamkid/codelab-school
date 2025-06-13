'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Class, Enrollment, Student, Parent } from '@/types/models';
import { getClass } from '@/lib/services/classes';
import { getEnrollmentsByClass, updatePaymentStatus, dropStudent } from '@/lib/services/enrollments';
import { getStudent, getParent } from '@/lib/services/parents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ChevronLeft, 
  Plus, 
  Search,
  Phone,
  DollarSign,
  MoreVertical,
  Edit,
  UserX,
  ArrowRightLeft,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EnrollmentDialog from '@/components/enrollments/enrollment-dialog';
import PaymentDialog from '@/components/enrollments/payment-dialog';
import TransferDialog from '@/components/enrollments/transfer-dialog';

interface EnrollmentWithDetails extends Enrollment {
  student?: Student;
  parent?: Parent;
}

export default function ClassStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  
  const [classData, setClassData] = useState<Class | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [dropDialogOpen, setDropDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentWithDetails | null>(null);
  const [dropReason, setDropReason] = useState('');

  useEffect(() => {
    if (classId) {
      loadData();
    }
  }, [classId]);

  const loadData = async () => {
    try {
      // Load class data
      const classInfo = await getClass(classId);
      if (!classInfo) {
        toast.error('ไม่พบข้อมูลคลาส');
        router.push('/classes');
        return;
      }
      setClassData(classInfo);
      
      // Load enrollments
      const enrollmentsList = await getEnrollmentsByClass(classId);
      
      // Load student and parent details for each enrollment
      const enrollmentsWithDetails = await Promise.all(
        enrollmentsList.map(async (enrollment) => {
          const [student, parent] = await Promise.all([
            getStudent(enrollment.parentId, enrollment.studentId),
            getParent(enrollment.parentId)
          ]);
          
          return {
            ...enrollment,
            student,
            parent
          };
        })
      );
      
      setEnrollments(enrollmentsWithDetails);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentUpdate = async (enrollment: EnrollmentWithDetails) => {
    setSelectedEnrollment(enrollment);
    setPaymentDialogOpen(true);
  };

  const handleTransfer = (enrollment: EnrollmentWithDetails) => {
    setSelectedEnrollment(enrollment);
    setTransferDialogOpen(true);
  };

  const handleDrop = (enrollment: EnrollmentWithDetails) => {
    setSelectedEnrollment(enrollment);
    setDropReason('');
    setDropDialogOpen(true);
  };

  const confirmDrop = async () => {
    if (!selectedEnrollment || !dropReason.trim()) {
      toast.error('กรุณาระบุเหตุผล');
      return;
    }

    try {
      await dropStudent(selectedEnrollment.id, dropReason);
      toast.success('ยกเลิกการลงทะเบียนเรียบร้อยแล้ว');
      setDropDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error dropping student:', error);
      toast.error('ไม่สามารถยกเลิกการลงทะเบียนได้');
    }
  };

  // Filter enrollments
  const filteredEnrollments = enrollments.filter(enrollment => {
    if (!enrollment.student || !enrollment.parent) return false;
    
    const term = searchTerm.toLowerCase();
    return (
      enrollment.student.name.toLowerCase().includes(term) ||
      enrollment.student.nickname.toLowerCase().includes(term) ||
      enrollment.parent.displayName.toLowerCase().includes(term) ||
      enrollment.parent.phone.includes(term)
    );
  });

  // Calculate stats
  const stats = {
    total: enrollments.length,
    active: enrollments.filter(e => e.status === 'active').length,
    paid: enrollments.filter(e => e.payment.status === 'paid').length,
    pending: enrollments.filter(e => e.payment.status === 'pending').length,
    totalRevenue: enrollments
      .filter(e => e.payment.status === 'paid')
      .reduce((sum, e) => sum + e.payment.paidAmount, 0),
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

  if (!classData) {
    return null;
  }

  const isFull = classData.enrolledCount >= classData.maxStudents;

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <Link 
          href={`/classes/${classId}`} 
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          กลับไปหน้ารายละเอียดคลาส
        </Link>
      </div>

      {/* Class Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{classData.name}</h1>
        <p className="text-gray-600 mt-2">จัดการนักเรียนในคลาส</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">นักเรียนทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total}/{classData.maxStudents}
            </div>
            {isFull && (
              <p className="text-xs text-red-600 mt-1">คลาสเต็ม</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">กำลังเรียน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ชำระแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.paid}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">รอชำระ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">รายได้รวม</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalRevenue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="ค้นหาชื่อนักเรียน, ผู้ปกครอง, เบอร์โทร..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button 
          onClick={() => setEnrollmentDialogOpen(true)}
          className="bg-red-500 hover:bg-red-600"
          disabled={isFull}
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มนักเรียน
        </Button>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายชื่อนักเรียน</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEnrollments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-300 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'ไม่พบนักเรียนที่ค้นหา' : 'ยังไม่มีนักเรียนในคลาส'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'ลองค้นหาด้วยคำอื่น' : 'เริ่มต้นด้วยการเพิ่มนักเรียนคนแรก'}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setEnrollmentDialogOpen(true)}
                  className="bg-red-500 hover:bg-red-600"
                  disabled={isFull}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มนักเรียน
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ลำดับ</TableHead>
                    <TableHead>ชื่อนักเรียน</TableHead>
                    <TableHead>ผู้ปกครอง</TableHead>
                    <TableHead>ราคา</TableHead>
                    <TableHead className="text-center">การชำระเงิน</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                    <TableHead>วันที่ลงทะเบียน</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.map((enrollment, index) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {enrollment.student?.nickname || enrollment.student?.name}
                          </p>
                          <p className="text-sm text-gray-500">{enrollment.student?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{enrollment.parent?.displayName}</p>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Phone className="h-3 w-3" />
                            {enrollment.parent?.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatCurrency(enrollment.pricing.finalPrice)}</p>
                          {enrollment.pricing.discount > 0 && (
                            <p className="text-xs text-green-600">
                              ส่วนลด {enrollment.pricing.discountType === 'percentage' 
                                ? `${enrollment.pricing.discount}%` 
                                : formatCurrency(enrollment.pricing.discount)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {enrollment.payment.status === 'paid' ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            ชำระแล้ว
                          </Badge>
                        ) : enrollment.payment.status === 'partial' ? (
                          <Badge className="bg-orange-100 text-orange-700">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            ชำระบางส่วน
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            รอชำระ
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {enrollment.status === 'active' ? (
                          <Badge className="bg-green-100 text-green-700">กำลังเรียน</Badge>
                        ) : enrollment.status === 'completed' ? (
                          <Badge variant="secondary">จบแล้ว</Badge>
                        ) : enrollment.status === 'dropped' ? (
                          <Badge variant="destructive">ยกเลิก</Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-700">ย้ายคลาส</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(enrollment.enrolledAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/parents/${enrollment.parentId}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                ดูข้อมูลผู้ปกครอง
                              </Link>
                            </DropdownMenuItem>
                            
                            {enrollment.status === 'active' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handlePaymentUpdate(enrollment)}>
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  อัพเดตการชำระเงิน
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleTransfer(enrollment)}>
                                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                                  ย้ายคลาส
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDrop(enrollment)}
                                  className="text-red-600"
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  ยกเลิกการเรียน
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <EnrollmentDialog
        open={enrollmentDialogOpen}
        onOpenChange={setEnrollmentDialogOpen}
        classId={classId}
        classData={classData}
        onSuccess={loadData}
      />

      {/* Payment Dialog */}
      {selectedEnrollment && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          enrollment={selectedEnrollment}
          onSuccess={loadData}
        />
      )}

      {/* Transfer Dialog */}
      {selectedEnrollment && (
        <TransferDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          enrollment={selectedEnrollment}
          currentClassId={classId}
          onSuccess={loadData}
        />
      )}

      {/* Drop Confirmation Dialog */}
      <AlertDialog open={dropDialogOpen} onOpenChange={setDropDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกการเรียน</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>
                  คุณแน่ใจหรือไม่ที่จะยกเลิกการเรียนของ{' '}
                  <strong>{selectedEnrollment?.student?.nickname || selectedEnrollment?.student?.name}</strong>?
                </p>
                <div>
                  <label className="text-sm font-medium">เหตุผลในการยกเลิก *</label>
                  <textarea
                    value={dropReason}
                    onChange={(e) => setDropReason(e.target.value)}
                    placeholder="ระบุเหตุผล..."
                    className="w-full mt-1 p-2 border rounded-md"
                    rows={3}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ไม่ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDrop}
              className="bg-red-500 hover:bg-red-600"
              disabled={!dropReason.trim()}
            >
              ยืนยันยกเลิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}