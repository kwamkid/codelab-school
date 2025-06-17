// app/(admin)/trial/[id]/page.tsx

'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  TestTube,
  ArrowLeft,
  Phone,
  Mail,
  User,
  Calendar,
  Clock,
  MapPin,
  School,
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  PhoneCall,
  CalendarCheck,
  UserPlus,
  MoreVertical,
  History
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { TrialBooking, TrialSession, Subject, Teacher, Branch, Room } from '@/types/models';
import { 
  getTrialBooking, 
  getTrialSessionsByBooking,
  updateBookingStatus,
  updateTrialSession,
  cancelTrialSession
} from '@/lib/services/trial-bookings';
import { getSubjects } from '@/lib/services/subjects';
import { getTeachers } from '@/lib/services/teachers';
import { getBranches } from '@/lib/services/branches';
import { getRoomsByBranch } from '@/lib/services/rooms';
import { formatDate } from '@/lib/utils';
import TrialSessionDialog from '@/components/trial/trial-session-dialog';
import ContactHistorySection from '@/components/trial/contact-history-section';
import ConvertToStudentDialog from '@/components/trial/convert-to-student-dialog';
import RescheduleTrialDialog from '@/components/trial/reschedule-trial-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusConfig = {
  new: { label: 'ใหม่', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  contacted: { label: 'ติดต่อแล้ว', color: 'bg-yellow-100 text-yellow-700', icon: PhoneCall },
  scheduled: { label: 'นัดหมายแล้ว', color: 'bg-purple-100 text-purple-700', icon: CalendarCheck },
  completed: { label: 'เรียนแล้ว', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  converted: { label: 'ลงทะเบียนแล้ว', color: 'bg-emerald-100 text-emerald-700', icon: UserPlus },
  cancelled: { label: 'ยกเลิก', color: 'bg-gray-100 text-gray-700', icon: XCircle }
};

const sourceConfig = {
  online: { label: 'Online', color: 'bg-blue-100 text-blue-700' },
  walkin: { label: 'Walk-in', color: 'bg-green-100 text-green-700' },
  phone: { label: 'โทรศัพท์', color: 'bg-purple-100 text-purple-700' }
};

export default function TrialBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<TrialBooking | null>(null);
  const [sessions, setSessions] = useState<TrialSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rooms, setRooms] = useState<Record<string, Room[]>>({});
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrialSession | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [resolvedParams.id]);

  // เพิ่ม useEffect เพื่อตรวจสอบ action parameter
  useEffect(() => {
    const action = searchParams.get('action');
    const sessionId = searchParams.get('sessionId');
    
    if (action === 'reschedule' && sessionId && sessions.length > 0) {
      const sessionToReschedule = sessions.find(s => s.id === sessionId);
      if (sessionToReschedule) {
        setSelectedSession(sessionToReschedule);
        setRescheduleModalOpen(true);
        
        // Clear URL parameters using Next.js router
        router.replace(`/trial/${resolvedParams.id}`, { scroll: false });
      }
    }
  }, [searchParams, sessions, router, resolvedParams.id]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const [bookingData, subjectsData, teachersData, branchesData] = await Promise.all([
        getTrialBooking(resolvedParams.id),
        getSubjects(),
        getTeachers(),
        getBranches()
      ]);
      
      if (!bookingData) {
        toast.error('ไม่พบข้อมูลการจอง');
        router.push('/trial');
        return;
      }
      
      setBooking(bookingData);
      setSubjects(subjectsData.filter(s => s.isActive));
      setTeachers(teachersData.filter(t => t.isActive));
      setBranches(branchesData.filter(b => b.isActive));
      
      // Load sessions
      const sessionsData = await getTrialSessionsByBooking(resolvedParams.id);
      setSessions(sessionsData);
      
      // Load rooms for all branches
      const roomsData: Record<string, Room[]> = {};
      for (const branch of branchesData) {
        const branchRooms = await getRoomsByBranch(branch.id);
        roomsData[branch.id] = branchRooms;
      }
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: TrialBooking['status'], note?: string) => {
    if (!booking) return;
    
    try {
      await updateBookingStatus(booking.id, newStatus, note);
      setBooking({ ...booking, status: newStatus });
      toast.success('อัพเดทสถานะเรียบร้อย');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('ไม่สามารถอัพเดทสถานะได้');
    }
  };

  const handleSessionCreated = () => {
    loadData();
    setSessionModalOpen(false);
    setSelectedStudent('');
  };

  const handleSessionUpdated = () => {
    loadData();
  };

  const handleConversionSuccess = () => {
    loadData();
    setConvertModalOpen(false);
    setSelectedSession(null);
  };

  const handleRescheduleSuccess = () => {
    loadData();
    setRescheduleModalOpen(false);
    setSelectedSession(null);
    
    // Make sure URL is clean
    router.replace(`/trial/${resolvedParams.id}`, { scroll: false });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!booking) return null;

  // Get students who haven't scheduled trial yet
  const unscheduledStudents = booking.students.filter(student => 
    !sessions.some(session => session.studentName === student.name)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/trial')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          กลับ
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TestTube className="h-8 w-8 text-red-500" />
              รายละเอียดการจองทดลองเรียน
            </h1>
            <p className="text-gray-600 mt-2">
              จองเมื่อ {formatDate(booking.createdAt, 'full')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getSourceBadge(booking.source)}
            {getStatusBadge(booking.status)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Booking Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Parent Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400" />
                ข้อมูลผู้ปกครอง
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">ชื่อ-นามสกุล</span>
                  <span className="font-medium">{booking.parentName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">เบอร์โทรศัพท์</span>
                  <span className="font-medium">{booking.parentPhone}</span>
                </div>
                {booking.parentEmail && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">อีเมล</span>
                    <span className="font-medium">{booking.parentEmail}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Students Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-gray-400" />
                นักเรียน ({booking.students.length} คน)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {booking.students.map((student, idx) => (
                  <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-base">{student.name}</h4>
                        {student.schoolName && (
                          <p className="text-sm text-gray-600">
                            <School className="inline h-3 w-3 mr-1" />
                            {student.schoolName}
                            {student.gradeLevel && ` (${student.gradeLevel})`}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        คนที่ {idx + 1}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">วิชาที่สนใจ:</p>
                      <div className="flex flex-wrap gap-1">
                        {student.subjectInterests.map(subjectId => {
                          const subject = subjects.find(s => s.id === subjectId);
                          return subject ? (
                            <Badge 
                              key={subjectId} 
                              className="text-xs"
                              style={{ 
                                backgroundColor: `${subject.color}20`,
                                color: subject.color,
                                borderColor: subject.color
                              }}
                            >
                              {subject.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Trial Sessions */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">การทดลองเรียน</CardTitle>
                  <CardDescription className="text-xs">
                    จัดการนัดหมายทดลองเรียนสำหรับแต่ละนักเรียน
                  </CardDescription>
                </div>
                {unscheduledStudents.length > 0 && (
                  <Button
                    onClick={() => setSessionModalOpen(true)}
                    size="sm"
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    นัดหมาย
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">ยังไม่มีการนัดหมายทดลองเรียน</p>
                  {booking.status === 'new' && (
                    <p className="text-sm text-gray-400 mt-2">
                      กรุณาติดต่อผู้ปกครองก่อนนัดหมาย
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>นักเรียน</TableHead>
                        <TableHead>วิชา</TableHead>
                        <TableHead>วันที่และเวลา</TableHead>
                        <TableHead>สาขา/ครู/ห้อง</TableHead>
                        <TableHead className="text-center">การเข้าเรียน</TableHead>
                        <TableHead>ประวัติ</TableHead>
                        <TableHead className="text-right">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => {
                        const subject = subjects.find(s => s.id === session.subjectId);
                        const teacher = teachers.find(t => t.id === session.teacherId);
                        const branch = branches.find(b => b.id === session.branchId);
                        const room = rooms[session.branchId]?.find(r => r.id === session.roomId);
                        const isPast = new Date(session.scheduledDate) < new Date();
                        
                        return (
                          <TableRow key={session.id} className={session.status === 'cancelled' ? 'opacity-60' : ''}>
                            <TableCell>
                              <div className="font-medium">{session.studentName}</div>
                              {session.converted && (
                                <Badge className="mt-1 bg-emerald-100 text-emerald-700" variant="outline">
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  ลงทะเบียนแล้ว
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge style={{ backgroundColor: subject?.color || '#EF4444' }}>
                                {subject?.name}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{formatDate(session.scheduledDate)}</div>
                                <div className="text-sm text-gray-600">
                                  {session.startTime} - {session.endTime}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{branch?.name}</div>
                                <div className="text-sm text-gray-600">
                                  ครู{teacher?.nickname || teacher?.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  ห้อง {session.roomName || room?.name || session.roomId}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {/* ถ้าลงทะเบียนแล้ว ไม่ต้องแสดงสถานะอื่น */}
                              {session.converted ? (
                                <Badge className="bg-emerald-100 text-emerald-700">
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  ลงทะเบียนแล้ว
                                </Badge>
                              ) : (
                                // แสดงสถานะปกติถ้ายังไม่ได้ลงทะเบียน
                                <>
                                  {session.status === 'scheduled' && isPast ? (
                                    <div className="flex gap-2 justify-center">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                                        onClick={async () => {
                                          try {
                                            await updateTrialSession(session.id, {
                                              status: 'attended',
                                              attended: true
                                            });
                                            
                                            // Check if all sessions are completed
                                            const updatedSessions = sessions.map(s => 
                                              s.id === session.id ? { ...s, status: 'attended' as const } : s
                                            );
                                            const allCompleted = updatedSessions.every(s => 
                                              s.status === 'attended' || s.status === 'absent' || s.status === 'cancelled' || s.converted
                                            );
                                            
                                            if (allCompleted) {
                                              await updateBookingStatus(booking.id, 'completed');
                                            }
                                            
                                            toast.success('บันทึกการเข้าเรียนสำเร็จ');
                                            loadData();
                                          } catch (error) {
                                            toast.error('เกิดข้อผิดพลาดในการบันทึก');
                                          }
                                        }}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        มาเรียน
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                                        onClick={async () => {
                                          try {
                                            await updateTrialSession(session.id, {
                                              status: 'absent',
                                              attended: false
                                            });
                                            
                                            const updatedSessions = sessions.map(s => 
                                              s.id === session.id ? { ...s, status: 'absent' as const } : s
                                            );
                                            const allCompleted = updatedSessions.every(s => 
                                              s.status === 'attended' || s.status === 'absent' || s.status === 'cancelled' || s.converted
                                            );
                                            
                                            if (allCompleted) {
                                              await updateBookingStatus(booking.id, 'completed');
                                            }
                                            
                                            toast.success('บันทึกว่าไม่มาเรียน');
                                            loadData();
                                          } catch (error) {
                                            toast.error('เกิดข้อผิดพลาดในการบันทึก');
                                          }
                                        }}
                                      >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        ไม่มา
                                      </Button>
                                    </div>
                                  ) : session.status === 'scheduled' && !isPast ? (
                                    <Badge className="bg-purple-100 text-purple-700">
                                      รอถึงวัน
                                    </Badge>
                                  ) : (
                                    <Badge className={
                                      session.status === 'attended' ? 'bg-green-100 text-green-700' :
                                      session.status === 'absent' ? 'bg-red-100 text-red-700' :
                                      'bg-gray-100 text-gray-700'
                                    }>
                                      {session.status === 'attended' ? 'เข้าเรียนแล้ว' :
                                       session.status === 'absent' ? 'ไม่มาเรียน' :
                                       'ยกเลิก'}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </TableCell>
                            <TableCell>
                              {session.rescheduleHistory && session.rescheduleHistory.length > 0 && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="h-auto py-1 px-2"
                                    >
                                      <History className="h-3 w-3 mr-1" />
                                      เลื่อน {session.rescheduleHistory.length} ครั้ง
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80">
                                    <div className="space-y-3">
                                      <h4 className="font-medium text-sm flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        ประวัติการเลื่อนนัด
                                      </h4>
                                      <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {session.rescheduleHistory.map((history, idx) => {
                                          // Convert Timestamp to Date if needed
                                          const originalDate = history.originalDate instanceof Date 
                                            ? history.originalDate 
                                            : new Date((history.originalDate as any).seconds * 1000);
                                          const newDate = history.newDate instanceof Date 
                                            ? history.newDate 
                                            : new Date((history.newDate as any).seconds * 1000);
                                          const rescheduledAt = history.rescheduledAt instanceof Date 
                                            ? history.rescheduledAt 
                                            : new Date((history.rescheduledAt as any).seconds * 1000);
                                          
                                          return (
                                            <div key={idx} className="text-sm border-l-2 border-gray-200 pl-3">
                                              <div className="font-medium mb-1">ครั้งที่ {idx + 1}</div>
                                              <div className="text-gray-600 space-y-0.5 text-xs">
                                                <div className="flex items-start gap-1">
                                                  <span className="text-gray-500">จาก:</span>
                                                  <span>{formatDate(originalDate)} {history.originalTime}</span>
                                                </div>
                                                <div className="flex items-start gap-1">
                                                  <span className="text-gray-500">เป็น:</span>
                                                  <span>{formatDate(newDate)} {history.newTime}</span>
                                                </div>
                                                <div className="flex items-start gap-1">
                                                  <span className="text-gray-500">เหตุผล:</span>
                                                  <span>{history.reason}</span>
                                                </div>
                                                <div className="flex items-start gap-1">
                                                  <span className="text-gray-500">เมื่อ:</span>
                                                  <span>{formatDate(rescheduledAt, 'full')}</span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 z-50">
                                  <DropdownMenuLabel>จัดการ</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  
                                  {/* ถ้าลงทะเบียนแล้ว ไม่ต้องแสดง action อื่น */}
                                  {session.converted ? (
                                    <DropdownMenuItem disabled className="text-gray-400">
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      ลงทะเบียนเรียบร้อยแล้ว
                                    </DropdownMenuItem>
                                  ) : (
                                    <>
                                      {session.status === 'scheduled' && isPast && (
                                        <DropdownMenuItem
                                          onSelect={async () => {
                                            try {
                                              await updateTrialSession(session.id, {
                                                status: 'attended',
                                                attended: true
                                              });
                                              
                                              const allSessions = sessions.filter(s => s.id !== session.id);
                                              const allAttended = allSessions.every(s => 
                                                s.status === 'attended' || s.status === 'absent' || s.status === 'cancelled' || s.converted
                                              );
                                              
                                              if (allAttended) {
                                                await updateBookingStatus(booking.id, 'completed');
                                              }
                                              
                                              toast.success('บันทึกการเข้าเรียนสำเร็จ');
                                              loadData();
                                            } catch (error) {
                                              console.error('Error updating attendance:', error);
                                              toast.error('เกิดข้อผิดพลาดในการบันทึก');
                                            }
                                          }}
                                        >
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          บันทึกว่าเข้าเรียนแล้ว
                                        </DropdownMenuItem>
                                      )}
                                      
                                      {session.status === 'attended' && !session.converted && (
                                        <DropdownMenuItem 
                                          onSelect={() => {
                                            setSelectedSession(session);
                                            setConvertModalOpen(true);
                                          }}
                                          className="text-green-600 focus:text-green-600"
                                        >
                                          <UserPlus className="h-4 w-4 mr-2" />
                                          แปลงเป็นนักเรียน
                                        </DropdownMenuItem>
                                      )}
                                      
                                      {session.status === 'scheduled' && !isPast && (
                                        <>
                                          <DropdownMenuItem
                                            onSelect={() => {
                                              setSelectedSession(session);
                                              setRescheduleModalOpen(true);
                                            }}
                                          >
                                            <Edit className="h-4 w-4 mr-2" />
                                            เปลี่ยนวันนัดหมาย
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem 
                                            className="text-red-600 focus:text-red-600"
                                            onSelect={async () => {
                                              if (confirm('ยืนยันการยกเลิกนัดหมาย?')) {
                                                try {
                                                  await cancelTrialSession(session.id, 'ยกเลิกโดย Admin');
                                                  toast.success('ยกเลิกนัดหมายสำเร็จ');
                                                  loadData();
                                                } catch (error) {
                                                  toast.error('เกิดข้อผิดพลาดในการยกเลิก');
                                                }
                                              }
                                            }}
                                          >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            ยกเลิกนัดหมาย
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      
                                      {session.status === 'absent' && (
                                        <DropdownMenuItem
                                          onSelect={() => {
                                            setSelectedSession(session);
                                            setRescheduleModalOpen(true);
                                          }}
                                          className="text-blue-600 focus:text-blue-600"
                                        >
                                          <Calendar className="h-4 w-4 mr-2" />
                                          นัดวันใหม่
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
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
        </div>

        {/* Right Column - Actions & History */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">การดำเนินการ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {booking.status === 'new' && (
                <Button
                  onClick={() => handleStatusUpdate('contacted')}
                  className="w-full"
                  variant="outline"
                >
                  <PhoneCall className="h-4 w-4 mr-2" />
                  บันทึกว่าติดต่อแล้ว
                </Button>
              )}
              
              {booking.status === 'contacted' && (
                <>
                  {sessions.length === 0 && (
                    <Alert className="mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        กรุณานัดหมายทดลองเรียนให้กับนักเรียน
                      </AlertDescription>
                    </Alert>
                  )}
                  {sessions.length > 0 && (
                    <Button
                      onClick={() => handleStatusUpdate('scheduled')}
                      className="w-full mb-2"
                      variant="outline"
                    >
                      <CalendarCheck className="h-4 w-4 mr-2" />
                      เปลี่ยนสถานะเป็นนัดหมายแล้ว
                    </Button>
                  )}
                  <button
                    onClick={() => handleStatusUpdate('new')}
                    className="text-xs text-gray-500 hover:text-gray-700 underline w-full text-center"
                  >
                    กลับสถานะเป็นยังไม่ได้ติดต่อ
                  </button>
                </>
              )}
              
              {sessions.some(s => s.status === 'attended' && !s.converted) && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    มีนักเรียนที่ทดลองเรียนแล้ว สามารถแปลงเป็นนักเรียนจริงได้
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Contact History */}
          <ContactHistorySection booking={booking} onUpdate={loadData} />
        </div>
      </div>

      {/* Modals */}
      {sessionModalOpen && (
        <TrialSessionDialog
          isOpen={sessionModalOpen}
          onClose={() => {
            setSessionModalOpen(false);
            setSelectedStudent('');
          }}
          bookingId={booking.id}
          students={unscheduledStudents}
          subjects={subjects}
          teachers={teachers}
          branches={branches}
          onSuccess={handleSessionCreated}
        />
      )}

      {convertModalOpen && selectedSession && (
        <ConvertToStudentDialog
          isOpen={convertModalOpen}
          onClose={() => {
            setConvertModalOpen(false);
            setSelectedSession(null);
          }}
          booking={booking}
          session={selectedSession}
          onSuccess={handleConversionSuccess}
        />
      )}

      {rescheduleModalOpen && selectedSession && (
        <RescheduleTrialDialog
          isOpen={rescheduleModalOpen}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedSession(null);
          }}
          session={selectedSession}
          onSuccess={handleRescheduleSuccess}
        />
      )}
    </div>
  );
}