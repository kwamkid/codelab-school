'use client';

import { useEffect, useState } from 'react';
import { Enrollment, Parent, Student, Class, Branch } from '@/types/models';
import { getEnrollments, deleteEnrollment, updateEnrollment, cancelEnrollment } from '@/lib/services/enrollments';
import { getParents } from '@/lib/services/parents';
import { getClasses } from '@/lib/services/classes';
import { getBranches } from '@/lib/services/branches';
import { getAllStudentsWithParents } from '@/lib/services/parents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Users, 
  DollarSign, 
  TrendingUp,
  Calendar,
  Eye,
  Edit,
  XCircle,
  Trash2,
  MoreVertical,
  CreditCard,
  CheckCircle,
  Loader2,
  Printer
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBranch } from '@/contexts/BranchContext';

type StudentWithParent = Student & { parentName: string; parentPhone: string; parentId: string };

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

export default function EnrollmentsPage() {
  const { selectedBranchId, isAllBranches } = useBranch();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<StudentWithParent[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Quick payment update states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [paymentUpdating, setPaymentUpdating] = useState(false);
  const [quickPayment, setQuickPayment] = useState({
    status: 'pending' as 'pending' | 'partial' | 'paid',
    paidAmount: 0,
    receiptNumber: ''
  });
  
  // Cancel enrollment states
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedBranchId]); // Reload when branch changes

  const loadData = async () => {
    try {
      const [enrollmentsData, studentsData, classesData, branchesData] = await Promise.all([
        getEnrollments(selectedBranchId),
        getAllStudentsWithParents(selectedBranchId),
        getClasses(selectedBranchId),
        getBranches()
      ]);
      
      setEnrollments(enrollmentsData);
      setStudents(studentsData);
      setClasses(classesData);
      setBranches(branchesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions to get related data
  const getStudentInfo = (studentId: string) => {
    return students.find(s => s.id === studentId);
  };

  const getClassInfo = (classId: string) => {
    return classes.find(c => c.id === classId);
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || 'Unknown';
  };

  // Handle delete enrollment
  const handleDeleteEnrollment = async (enrollmentId: string) => {
    setDeletingId(enrollmentId);
    try {
      await deleteEnrollment(enrollmentId);
      toast.success('ลบการลงทะเบียนเรียบร้อยแล้ว');
      loadData(); // Reload data
    } catch (error) {
      console.error('Error deleting enrollment:', error);
      toast.error('ไม่สามารถลบการลงทะเบียนได้');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle quick payment update
  const handleQuickPaymentUpdate = async () => {
    if (!selectedEnrollment) return;
    
    setPaymentUpdating(true);
    try {
      const updateData: Partial<Enrollment> = {
        payment: {
          ...selectedEnrollment.payment,
          status: quickPayment.status,
          paidAmount: quickPayment.paidAmount,
          method: selectedEnrollment.payment.method
        }
      };

      // Add receipt number if provided
      if (quickPayment.receiptNumber) {
        updateData.payment!.receiptNumber = quickPayment.receiptNumber;
      }

      // Set paid date if status is paid
      if (quickPayment.status === 'paid' && selectedEnrollment.payment.status !== 'paid') {
        updateData.payment!.paidDate = new Date();
      }

      await updateEnrollment(selectedEnrollment.id, updateData);
      toast.success('อัพเดทการชำระเงินเรียบร้อยแล้ว');
      setShowPaymentDialog(false);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('ไม่สามารถอัพเดทการชำระเงินได้');
    } finally {
      setPaymentUpdating(false);
    }
  };

  // Handle cancel enrollment
  const handleCancelEnrollment = async () => {
    if (!selectedEnrollment || !cancelReason.trim()) {
      toast.error('กรุณาระบุเหตุผลในการยกเลิก');
      return;
    }
    
    setCancelling(true);
    try {
      await cancelEnrollment(selectedEnrollment.id, cancelReason);
      toast.success('ยกเลิกการลงทะเบียนเรียบร้อยแล้ว');
      setShowCancelDialog(false);
      setCancelReason('');
      loadData(); // Reload data
    } catch (error) {
      console.error('Error cancelling enrollment:', error);
      toast.error('ไม่สามารถยกเลิกการลงทะเบียนได้');
    } finally {
      setCancelling(false);
    }
  };

  // Handle print receipt
  const handlePrintReceipt = () => {
    // TODO: Implement print receipt
    toast.info('ฟังก์ชันพิมพ์ใบเสร็จจะเพิ่มในภายหลัง');
  };

  // Filter enrollments
  const filteredEnrollments = enrollments.filter(enrollment => {
    // Status filter
    if (selectedStatus !== 'all' && enrollment.status !== selectedStatus) return false;
    
    // Payment status filter
    if (selectedPaymentStatus !== 'all' && enrollment.payment.status !== selectedPaymentStatus) return false;
    
    // Search filter
    if (searchTerm) {
      const student = getStudentInfo(enrollment.studentId);
      const classInfo = getClassInfo(enrollment.classId);
      const searchLower = searchTerm.toLowerCase();
      
      return (
        student?.name.toLowerCase().includes(searchLower) ||
        student?.nickname.toLowerCase().includes(searchLower) ||
        student?.parentName.toLowerCase().includes(searchLower) ||
        classInfo?.name.toLowerCase().includes(searchLower) ||
        classInfo?.code.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Calculate statistics
  const stats = {
    total: enrollments.length,
    active: enrollments.filter(e => e.status === 'active').length,
    totalRevenue: enrollments
      .filter(e => e.payment.status === 'paid')
      .reduce((sum, e) => sum + e.payment.paidAmount, 0),
    pendingPayments: enrollments
      .filter(e => e.payment.status === 'pending')
      .reduce((sum, e) => sum + e.pricing.finalPrice, 0),
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            จัดการการลงทะเบียน
            {!isAllBranches && <span className="text-red-600 text-lg ml-2">(เฉพาะสาขาที่เลือก)</span>}
          </h1>
          <p className="text-gray-600 mt-2">จัดการข้อมูลการลงทะเบียนเรียนทั้งหมด</p>
        </div>
        <Link href="/enrollments/new">
          <Button className="bg-red-500 hover:bg-red-600">
            <Plus className="h-4 w-4 mr-2" />
            ลงทะเบียนใหม่
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ลงทะเบียนทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1">กำลังเรียน {stats.active} คน</p>
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
            <p className="text-xs text-gray-500 mt-1">ชำระแล้ว</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">รอชำระเงิน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(stats.pendingPayments)}
            </div>
            <p className="text-xs text-gray-500 mt-1">ค้างชำระ</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">อัตราการคงอยู่</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 
                ? `${((stats.active / stats.total) * 100).toFixed(0)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-gray-500 mt-1">นักเรียนที่ยังเรียนอยู่</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="ค้นหาชื่อนักเรียน, ผู้ปกครอง, ชื่อคลาส..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="สถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedPaymentStatus} onValueChange={setSelectedPaymentStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="การชำระเงิน" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            {Object.entries(paymentStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Enrollments Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการลงทะเบียน ({filteredEnrollments.length} รายการ)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEnrollments.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ไม่พบข้อมูลการลงทะเบียน
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedStatus !== 'all' || selectedPaymentStatus !== 'all'
                  ? 'ลองปรับเงื่อนไขการค้นหา'
                  : 'เริ่มต้นด้วยการลงทะเบียนนักเรียนคนแรก'}
              </p>
              {enrollments.length === 0 && (
                <Link href="/enrollments/new">
                  <Button className="bg-red-500 hover:bg-red-600">
                    <Plus className="h-4 w-4 mr-2" />
                    ลงทะเบียนใหม่
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>นักเรียน</TableHead>
                    <TableHead>คลาส</TableHead>
                    {isAllBranches && <TableHead>สาขา</TableHead>}
                    <TableHead>วันที่ลงทะเบียน</TableHead>
                    <TableHead className="text-right">ค่าเรียน</TableHead>
                    <TableHead className="text-center">การชำระเงิน</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.map((enrollment) => {
                    const student = getStudentInfo(enrollment.studentId);
                    const classInfo = getClassInfo(enrollment.classId);
                    
                    return (
                      <TableRow key={enrollment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student?.nickname || student?.name}</p>
                            <p className="text-sm text-gray-500">ผู้ปกครอง: {student?.parentName}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{classInfo?.name}</p>
                            <p className="text-sm text-gray-500">{classInfo?.code}</p>
                          </div>
                        </TableCell>
                        {isAllBranches && <TableCell>{getBranchName(enrollment.branchId)}</TableCell>}
                        <TableCell>{formatDate(enrollment.enrolledAt)}</TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p className="font-medium">{formatCurrency(enrollment.pricing.finalPrice)}</p>
                            {enrollment.pricing.discount > 0 && (
                              <p className="text-sm text-green-600">
                                -ส่วนลด {formatCurrency(enrollment.pricing.discount)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={paymentStatusColors[enrollment.payment.status]}>
                            {paymentStatusLabels[enrollment.payment.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={statusColors[enrollment.status]}>
                            {statusLabels[enrollment.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>จัดการ</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              
                              <Link href={`/enrollments/${enrollment.id}`}>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  ดูรายละเอียด
                                </DropdownMenuItem>
                              </Link>
                              
                              {/* Payment related actions */}
                              {enrollment.payment.status === 'paid' && (
                                <DropdownMenuItem onClick={handlePrintReceipt}>
                                  <Printer className="h-4 w-4 mr-2" />
                                  พิมพ์ใบเสร็จ
                                </DropdownMenuItem>
                              )}
                              
                              {enrollment.payment.status !== 'paid' && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedEnrollment(enrollment);
                                    setQuickPayment({
                                      status: enrollment.payment.status,
                                      paidAmount: enrollment.payment.paidAmount,
                                      receiptNumber: enrollment.payment.receiptNumber || ''
                                    });
                                    setShowPaymentDialog(true);
                                  }}
                                  className="text-green-600"
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  อัพเดทการชำระ
                                </DropdownMenuItem>
                              )}
                              
                              <Link href={`/enrollments/${enrollment.id}/edit`}>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  แก้ไข
                                </DropdownMenuItem>
                              </Link>
                              
                              {/* Cancel enrollment for active status */}
                              {enrollment.status === 'active' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedEnrollment(enrollment);
                                      setCancelReason('');
                                      setShowCancelDialog(true);
                                    }}
                                    className="text-orange-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    ยกเลิกการลงทะเบียน
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              <DropdownMenuSeparator />
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    ลบ
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      คุณแน่ใจหรือไม่ที่จะลบการลงทะเบียนของ {student?.nickname}?
                                      การกระทำนี้ไม่สามารถย้อนกลับได้
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteEnrollment(enrollment.id)}
                                      className="bg-red-500 hover:bg-red-600"
                                      disabled={deletingId === enrollment.id}
                                    >
                                      {deletingId === enrollment.id ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          กำลังลบ...
                                        </>
                                      ) : (
                                        'ลบ'
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Payment Update Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>อัพเดทการชำระเงิน</DialogTitle>
            <DialogDescription>
              อัพเดทสถานะการชำระเงินสำหรับ {selectedEnrollment && getStudentInfo(selectedEnrollment.studentId)?.nickname}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>สถานะการชำระ</Label>
              <Select 
                value={quickPayment.status}
                onValueChange={(value: 'pending' | 'partial' | 'paid') => 
                  setQuickPayment(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">รอชำระ</SelectItem>
                  <SelectItem value="partial">ชำระบางส่วน</SelectItem>
                  <SelectItem value="paid">ชำระแล้ว</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>ยอดที่ชำระแล้ว</Label>
              <Input
                type="number"
                value={quickPayment.paidAmount || ''}
                onChange={(e) => setQuickPayment(prev => ({ 
                  ...prev, 
                  paidAmount: parseFloat(e.target.value) || 0 
                }))}
                placeholder="0"
              />
              <p className="text-sm text-gray-500 mt-1">
                ยอดที่ต้องชำระทั้งหมด: {formatCurrency(selectedEnrollment?.pricing.finalPrice || 0)}
              </p>
            </div>
            
            <div>
              <Label>เลขที่ใบเสร็จ (ถ้ามี)</Label>
              <Input
                value={quickPayment.receiptNumber}
                onChange={(e) => setQuickPayment(prev => ({ 
                  ...prev, 
                  receiptNumber: e.target.value 
                }))}
                placeholder="RC2025-001"
              />
            </div>
            
            {/* Show summary */}
            {quickPayment.paidAmount > 0 && selectedEnrollment && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>ยอดที่ต้องชำระ:</span>
                    <span>{formatCurrency(selectedEnrollment.pricing.finalPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ชำระแล้ว:</span>
                    <span className="text-green-600">{formatCurrency(quickPayment.paidAmount)}</span>
                  </div>
                  {quickPayment.paidAmount < selectedEnrollment.pricing.finalPrice && (
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>คงเหลือ:</span>
                      <span className="text-red-600">
                        {formatCurrency(selectedEnrollment.pricing.finalPrice - quickPayment.paidAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleQuickPaymentUpdate}
              disabled={paymentUpdating || quickPayment.paidAmount < 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {paymentUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  บันทึก
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Enrollment Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยกเลิกการลงทะเบียน</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ที่จะยกเลิกการลงทะเบียนของ {selectedEnrollment && getStudentInfo(selectedEnrollment.studentId)?.nickname}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>เหตุผลในการยกเลิก *</Label>
              <Textarea
                placeholder="กรุณาระบุเหตุผล..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason('');
              }}
            >
              ไม่ยกเลิก
            </Button>
            <Button 
              onClick={handleCancelEnrollment}
              disabled={cancelling || !cancelReason.trim()}
              className="bg-red-500 hover:bg-red-600"
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังยกเลิก...
                </>
              ) : (
                'ยืนยันการยกเลิก'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}