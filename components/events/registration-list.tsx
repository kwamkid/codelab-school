'use client';

import { useState } from 'react';
import { EventRegistration, EventSchedule, Branch } from '@/types/models';
import { cancelEventRegistration } from '@/lib/services/events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Users, 
  Phone, 
  Mail,
  Calendar,
  MapPin,
  X,
  Eye,
  UserCheck,
  AlertCircle,
  Building2,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatPhoneNumber } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import AttendanceChecker from './attendance-checker';

interface RegistrationListProps {
  eventId: string;
  registrations: EventRegistration[];
  schedules: EventSchedule[];
  branches: Branch[];
  countingMethod: 'students' | 'parents' | 'registrations';
  onUpdate: () => void;
}

export default function RegistrationList({ 
  eventId,
  registrations, 
  schedules, 
  branches,
  countingMethod,
  onUpdate 
}: RegistrationListProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRegistration, setSelectedRegistration] = useState<EventRegistration | null>(null);
  const [cancelRegistrationId, setCancelRegistrationId] = useState<string | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  // Filter registrations
  const filteredRegistrations = registrations.filter(reg => {
    const matchSearch = 
      reg.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.parentPhone.includes(searchTerm) ||
      reg.parentEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.students.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchSchedule = scheduleFilter === 'all' || reg.scheduleId === scheduleFilter;
    const matchBranch = branchFilter === 'all' || reg.branchId === branchFilter;
    const matchStatus = statusFilter === 'all' || reg.status === statusFilter;
    
    return matchSearch && matchSchedule && matchBranch && matchStatus;
  });

  const handleCancelRegistration = async () => {
    if (!cancelRegistrationId) return;

    try {
      await cancelEventRegistration(
        cancelRegistrationId,
        'ยกเลิกโดย Admin',
        user!.uid
      );
      toast.success('ยกเลิกการลงทะเบียนเรียบร้อยแล้ว');
      setCancelRegistrationId(null);
      onUpdate();
    } catch (error: any) {
      console.error('Error cancelling registration:', error);
      toast.error(error.message || 'ไม่สามารถยกเลิกการลงทะเบียนได้');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'confirmed': 'bg-green-100 text-green-700',
      'cancelled': 'bg-red-100 text-red-700',
      'attended': 'bg-blue-100 text-blue-700',
      'no-show': 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      'confirmed': 'ยืนยันแล้ว',
      'cancelled': 'ยกเลิก',
      'attended': 'เข้าร่วมแล้ว',
      'no-show': 'ไม่มา'
    };
    return texts[status] || status;
  };

  const getScheduleDisplay = (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return '-';
    return `${formatDate(schedule.date, 'short')} ${schedule.startTime}-${schedule.endTime}`;
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || branchId;
  };

  const exportToCSV = () => {
    // Prepare CSV data
    const headers = [
      'ลำดับ',
      'วันที่ลงทะเบียน',
      'ชื่อผู้ปกครอง',
      'เบอร์โทร',
      'อีเมล',
      'สาขา',
      'รอบเวลา',
      'จำนวน',
      'สถานะ',
      'วิธีลงทะเบียน'
    ];

    const rows = filteredRegistrations.map((reg, index) => [
      index + 1,
      formatDate(reg.registeredAt, 'short'),
      reg.parentName,
      reg.parentPhone,
      reg.parentEmail || '-',
      getBranchName(reg.branchId),
      getScheduleDisplay(reg.scheduleId),
      reg.attendeeCount,
      getStatusText(reg.status),
      reg.registeredFrom === 'liff' ? 'Online' : 'Admin'
    ]);

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `event-registrations-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            รายชื่อผู้ลงทะเบียน
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            เช็คชื่อ
          </TabsTrigger>
        </TabsList>

        {/* List Tab */}
        <TabsContent value="list" className="space-y-6">
          {/* Filters */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="ค้นหาชื่อ, เบอร์โทร, อีเมล..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button
                variant="outline"
                onClick={exportToCSV}
                disabled={filteredRegistrations.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="รอบเวลาทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">รอบเวลาทั้งหมด</SelectItem>
                  {schedules.map(schedule => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      {formatDate(schedule.date, 'short')} {schedule.startTime}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="สาขาทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">สาขาทั้งหมด</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="สถานะทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                  <SelectItem value="confirmed">ยืนยันแล้ว</SelectItem>
                  <SelectItem value="cancelled">ยกเลิก</SelectItem>
                  <SelectItem value="attended">เข้าร่วมแล้ว</SelectItem>
                  <SelectItem value="no-show">ไม่มา</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">ทั้งหมด</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredRegistrations.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">ยืนยันแล้ว</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {filteredRegistrations.filter(r => r.status === 'confirmed').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">เข้าร่วมแล้ว</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {filteredRegistrations.filter(r => r.status === 'attended').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">ยกเลิก</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {filteredRegistrations.filter(r => r.status === 'cancelled').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Registrations Table */}
          <Card>
            <CardContent className="p-0">
              {filteredRegistrations.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    ไม่พบข้อมูลการลงทะเบียน
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm || scheduleFilter !== 'all' || branchFilter !== 'all' || statusFilter !== 'all'
                      ? 'ลองปรับเงื่อนไขการค้นหา'
                      : 'ยังไม่มีผู้ลงทะเบียน'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ผู้ลงทะเบียน</TableHead>
                        <TableHead>ติดต่อ</TableHead>
                        <TableHead>รอบเวลา</TableHead>
                        <TableHead>สาขา</TableHead>
                        <TableHead className="text-center">จำนวน</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead className="text-right">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRegistrations.map((registration) => (
                        <TableRow key={registration.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{registration.parentName}</p>
                              <p className="text-sm text-gray-500">
                                ลงทะเบียน: {formatDate(registration.registeredAt, 'short')}
                              </p>
                              {registration.isGuest && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  Guest
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {formatPhoneNumber(registration.parentPhone)}
                              </div>
                              {registration.parentEmail && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="h-3 w-3" />
                                  {registration.parentEmail}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{formatDate(registration.scheduleDate, 'short')}</p>
                              <p className="text-gray-500">{registration.scheduleTime}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getBranchName(registration.branchId)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">
                              {registration.attendeeCount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(registration.status)}>
                              {getStatusText(registration.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRegistration(registration)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {registration.status === 'confirmed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCancelRegistrationId(registration.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
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

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <AttendanceChecker
            registrations={filteredRegistrations.filter(r => r.status !== 'cancelled')}
            schedules={schedules}
            branches={branches}
            onSave={onUpdate}
          />
        </TabsContent>
      </Tabs>

      {/* Registration Detail Dialog */}
      <Dialog open={!!selectedRegistration} onOpenChange={() => setSelectedRegistration(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>รายละเอียดการลงทะเบียน</DialogTitle>
            <DialogDescription>
              ข้อมูลผู้ลงทะเบียนและผู้เข้าร่วม
            </DialogDescription>
          </DialogHeader>
          
          {selectedRegistration && (
            <div className="space-y-6">
              {/* Registration Info */}
              <div className="space-y-2">
                <h3 className="font-medium">ข้อมูลการลงทะเบียน</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">วันที่ลงทะเบียน:</span>
                    <p className="font-medium">{formatDate(selectedRegistration.registeredAt, 'full')}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">ช่องทาง:</span>
                    <p className="font-medium">
                      {selectedRegistration.registeredFrom === 'liff' ? 'Online' : 'Admin'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">สถานะ:</span>
                    <Badge className={getStatusColor(selectedRegistration.status)}>
                      {getStatusText(selectedRegistration.status)}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-500">จำนวน:</span>
                    <p className="font-medium">{selectedRegistration.attendeeCount} คน</p>
                  </div>
                </div>
              </div>

              {/* Parent Info */}
              <div className="space-y-2">
                <h3 className="font-medium">ข้อมูลผู้ปกครอง</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">ชื่อ:</span> {selectedRegistration.parentName}</p>
                  <p><span className="text-gray-500">เบอร์โทร:</span> {formatPhoneNumber(selectedRegistration.parentPhone)}</p>
                  {selectedRegistration.parentEmail && (
                    <p><span className="text-gray-500">อีเมล:</span> {selectedRegistration.parentEmail}</p>
                  )}
                  {selectedRegistration.parentAddress && (
                    <p><span className="text-gray-500">ที่อยู่:</span> {selectedRegistration.parentAddress}</p>
                  )}
                </div>
              </div>

              {/* Schedule Info */}
              <div className="space-y-2">
                <h3 className="font-medium">รอบเวลาและสถานที่</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <Calendar className="h-4 w-4 inline mr-1" />
                    {formatDate(selectedRegistration.scheduleDate, 'long')} เวลา {selectedRegistration.scheduleTime}
                  </p>
                  <p>
                    <Building2 className="h-4 w-4 inline mr-1" />
                    สาขา {getBranchName(selectedRegistration.branchId)}
                  </p>
                </div>
              </div>

              {/* Students/Parents Info */}
              {countingMethod === 'students' && selectedRegistration.students.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">รายชื่อนักเรียน</h3>
                  <div className="space-y-2">
                    {selectedRegistration.students.map((student, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <p className="font-medium">{student.name} ({student.nickname})</p>
                        <p className="text-gray-500">
                          อายุ {new Date().getFullYear() - new Date(student.birthdate).getFullYear()} ปี
                          {student.schoolName && ` • ${student.schoolName}`}
                          {student.gradeLevel && ` • ${student.gradeLevel}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {countingMethod === 'parents' && selectedRegistration.parents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">รายชื่อผู้ปกครอง</h3>
                  <div className="space-y-2">
                    {selectedRegistration.parents.map((parent, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <p className="font-medium">
                          {parent.name} 
                          {parent.isMainContact && (
                            <Badge variant="outline" className="ml-2 text-xs">ผู้ติดต่อหลัก</Badge>
                          )}
                        </p>
                        <p className="text-gray-500">
                          {parent.phone}
                          {parent.email && ` • ${parent.email}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Request */}
              {selectedRegistration.specialRequest && (
                <div className="space-y-2">
                  <h3 className="font-medium">ความต้องการพิเศษ</h3>
                  <p className="text-sm text-gray-600">{selectedRegistration.specialRequest}</p>
                </div>
              )}

              {/* Referral Source */}
              {selectedRegistration.referralSource && (
                <div className="space-y-2">
                  <h3 className="font-medium">รู้จักงานนี้จาก</h3>
                  <p className="text-sm text-gray-600">{selectedRegistration.referralSource}</p>
                </div>
              )}

              {/* Cancellation Info */}
              {selectedRegistration.status === 'cancelled' && (
                <div className="space-y-2 p-3 bg-red-50 rounded-lg">
                  <h3 className="font-medium text-red-900">ข้อมูลการยกเลิก</h3>
                  <div className="text-sm text-red-700">
                    <p>ยกเลิกเมื่อ: {formatDate(selectedRegistration.cancelledAt!, 'full')}</p>
                    {selectedRegistration.cancellationReason && (
                      <p>เหตุผล: {selectedRegistration.cancellationReason}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Attendance Info */}
              {(selectedRegistration.status === 'attended' || selectedRegistration.status === 'no-show') && (
                <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900">ข้อมูลการเข้าร่วม</h3>
                  <div className="text-sm text-blue-700">
                    <p>สถานะ: {selectedRegistration.status === 'attended' ? 'เข้าร่วมแล้ว' : 'ไม่มา'}</p>
                    <p>เช็คชื่อเมื่อ: {formatDate(selectedRegistration.attendanceCheckedAt!, 'full')}</p>
                    {selectedRegistration.attendanceNote && (
                      <p>หมายเหตุ: {selectedRegistration.attendanceNote}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelRegistrationId} onOpenChange={() => setCancelRegistrationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกการลงทะเบียน</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะยกเลิกการลงทะเบียนนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelRegistration}
              className="bg-red-600 hover:bg-red-700"
            >
              ยืนยันการยกเลิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}