// app/(admin)/trial/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  TestTube, 
  Plus, 
  Phone,
  Mail,
  Users,
  Calendar,
  Search,
  ChevronRight,
  AlertCircle,
  Check,
  X,
  UserPlus,
  PhoneCall,
  CalendarCheck,
  Trash2,
  Eye,
  Building2,
  Clock,
  XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrialBooking, Branch } from '@/types/models';
import { 
  getTrialBookings, 
  getTrialBookingStats, 
  deleteTrialBooking, 
  cancelTrialBooking 
} from '@/lib/services/trial-bookings';
import { getBranches } from '@/lib/services/branches';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useLoading } from '@/contexts/LoadingContext';
import { useBranch } from '@/contexts/BranchContext';

const statusConfig = {
  new: { label: 'ใหม่', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  contacted: { label: 'ติดต่อแล้ว', color: 'bg-yellow-100 text-yellow-700', icon: PhoneCall },
  scheduled: { label: 'นัดหมายแล้ว', color: 'bg-purple-100 text-purple-700', icon: CalendarCheck },
  completed: { label: 'เรียนแล้ว', color: 'bg-green-100 text-green-700', icon: Check },
  converted: { label: 'ลงทะเบียนแล้ว', color: 'bg-emerald-100 text-emerald-700', icon: UserPlus },
  cancelled: { label: 'ยกเลิก', color: 'bg-gray-100 text-gray-700', icon: X }
};

const sourceConfig = {
  online: { label: 'Online', color: 'bg-blue-100 text-blue-700' },
  walkin: { label: 'Walk-in', color: 'bg-green-100 text-green-700' },
  phone: { label: 'โทรศัพท์', color: 'bg-purple-100 text-purple-700' }
};

export default function TrialBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<TrialBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<TrialBooking[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const { setLoading } = useLoading();
  const { selectedBranchId, isAllBranches } = useBranch();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [stats, setStats] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<TrialBooking | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadBookings();
    loadStats();
    loadBranches();
  }, [selectedBranchId]); // เพิ่ม dependency

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, selectedStatus]);

  const loadBranches = async () => {
    try {
      const data = await getBranches();
      setBranches(data);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await getTrialBookings(selectedBranchId);
      setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getTrialBookingStats(selectedBranchId);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(b => b.status === selectedStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b => 
        b.parentName.toLowerCase().includes(term) ||
        b.parentPhone.includes(term) ||
        b.students.some(s => s.name.toLowerCase().includes(term))
      );
    }

    setFilteredBookings(filtered);
  };

  const getStatusBadge = (status: TrialBooking['status']) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getSourceBadge = (source: TrialBooking['source']) => {
    const config = sourceConfig[source];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getBranchBadge = (branchId?: string) => {
    if (!branchId) {
      return <Badge variant="outline" className="text-gray-500">ไม่ระบุสาขา</Badge>;
    }
    
    const branch = branches.find(b => b.id === branchId);
    return (
      <Badge variant="outline" className="bg-gray-50">
        <Building2 className="h-3 w-3 mr-1" />
        {branch?.name || branchId}
      </Badge>
    );
  };

  const handleDeleteClick = (booking: TrialBooking) => {
    setBookingToDelete(booking);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!bookingToDelete) return;

    setDeleting(true);
    try {
      await deleteTrialBooking(bookingToDelete.id);
      toast.success('ลบข้อมูลการจองเรียบร้อย');
      loadBookings();
      loadStats();
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('ไม่สามารถลบข้อมูลได้');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setBookingToDelete(null);
    }
  };

  const handleCancelBooking = async (booking: TrialBooking) => {
    const reason = window.prompt('กรุณาระบุเหตุผลในการยกเลิก:');
    if (reason === null) return; // User clicked cancel
    
    try {
      await cancelTrialBooking(booking.id, reason || 'ยกเลิกโดย Admin');
      
      toast.success('ยกเลิกการจองเรียบร้อย');
      loadBookings();
      loadStats();
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast.error(error.message || 'ไม่สามารถยกเลิกการจองได้');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TestTube className="h-8 w-8 text-red-500" />
            จองทดลองเรียน
            {!isAllBranches && (
              <span className="text-lg font-normal text-gray-500">(เฉพาะสาขาที่เลือก)</span>
            )}
          </h1>
          <p className="text-gray-600 mt-2">จัดการการจองทดลองเรียนทั้งหมด</p>
        </div>
        <Button 
          onClick={() => router.push('/trial/new')}
          className="bg-red-500 hover:bg-red-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มการจอง (Walk-in)
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-gray-600">ทั้งหมด</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {stats.byStatus.new || 0}
              </div>
              <p className="text-sm text-gray-600">รอติดต่อ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {stats.byStatus.scheduled || 0}
              </div>
              <p className="text-sm text-gray-600">นัดหมายแล้ว</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {stats.byStatus.converted || 0}
              </div>
              <p className="text-sm text-gray-600">ลงทะเบียนแล้ว</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-emerald-600">
                {stats.conversionRate.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">อัตราการแปลง</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="ค้นหาชื่อผู้ปกครอง, นักเรียน หรือเบอร์โทร..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
        <TabsList>
          <TabsTrigger value="all">ทั้งหมด ({bookings.length})</TabsTrigger>
          <TabsTrigger value="new">
            ใหม่ ({bookings.filter(b => b.status === 'new').length})
          </TabsTrigger>
          <TabsTrigger value="contacted">
            ติดต่อแล้ว ({bookings.filter(b => b.status === 'contacted').length})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            นัดหมายแล้ว ({bookings.filter(b => b.status === 'scheduled').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            เรียนแล้ว ({bookings.filter(b => b.status === 'completed').length})
          </TabsTrigger>
          <TabsTrigger value="converted">
            ลงทะเบียน ({bookings.filter(b => b.status === 'converted').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="mt-6">
          <Card>
            <CardContent className="p-0">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-12">
                  <TestTube className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีการจองทดลองเรียน'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันที่/เวลา</TableHead>
                        <TableHead>ช่องทาง</TableHead>
                        {isAllBranches && <TableHead>สาขา</TableHead>}
                        <TableHead>ผู้ปกครอง</TableHead>
                        <TableHead>นักเรียน</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead className="text-center">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 font-medium">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                {formatDate(booking.createdAt)}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {formatDate(booking.createdAt, 'time')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getSourceBadge(booking.source)}
                          </TableCell>
                          {isAllBranches && (
                            <TableCell>
                              {getBranchBadge(booking.branchId)}
                            </TableCell>
                          )}
                          <TableCell>
                            <div>
                              <div className="font-medium">{booking.parentName}</div>
                              <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                <Phone className="h-3 w-3" />
                                {booking.parentPhone}
                              </div>
                              {booking.parentEmail && (
                                <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                  <Mail className="h-3 w-3" />
                                  {booking.parentEmail}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {booking.students.map((student, idx) => (
                                <div key={idx} className="text-sm">
                                  <div className="font-medium">{student.name}</div>
                                  {student.schoolName && (
                                    <div className="text-gray-600">
                                      {student.schoolName}
                                      {student.gradeLevel && ` (${student.gradeLevel})`}
                                    </div>
                                  )}
                                  <div className="text-gray-500">
                                    สนใจ {student.subjectInterests.length} วิชา
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(booking.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Link href={`/trial/${booking.id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                  <span className="ml-2 hidden sm:inline">ดูรายละเอียด</span>
                                </Button>
                              </Link>
                              
                              {/* แสดงปุ่มยกเลิกสำหรับสถานะ new, contacted, scheduled */}
                              {(booking.status === 'new' || booking.status === 'contacted' || booking.status === 'scheduled') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelBooking(booking)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {/* แสดงปุ่มลบสำหรับสถานะ new และ cancelled เท่านั้น */}
                              {(booking.status === 'new' || booking.status === 'cancelled') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteClick(booking)}
                                  className="text-gray-600 hover:text-gray-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบข้อมูล</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบข้อมูลการจองของ {bookingToDelete?.parentName} ใช่หรือไม่?
              <br />
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'กำลังลบ...' : 'ลบข้อมูล'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}