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
  MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { TrialBooking, TrialSession, Subject, Teacher, Branch, Room } from '@/types/models';
import { 
  getTrialBooking, 
  getTrialSessionsByBooking,
  updateBookingStatus
} from '@/lib/services/trial-bookings';
import { getSubjects } from '@/lib/services/subjects';
import { getTeachers } from '@/lib/services/teachers';
import { getBranches, getRoomsByBranch } from '@/lib/services/branches';
import { formatDate } from '@/lib/utils';
import TrialSessionDialog from '@/components/trial/trial-session-dialog';
import ContactHistorySection from '@/components/trial/contact-history-section';
import ConvertToStudentDialog from '@/components/trial/convert-to-student-dialog';
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
  const resolvedParams = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<TrialBooking | null>(null);
  const [sessions, setSessions] = useState<TrialSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrialSession | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [resolvedParams.id]);

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
          {/* Parent & Students Info - Compact Layout */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>ข้อมูลการจอง</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Parent Info - Inline */}
              <div className="flex flex-wrap items-center gap-4 pb-4 border-b">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{booking.parentName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{booking.parentPhone}</span>
                </div>
                {booking.parentEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{booking.parentEmail}</span>
                  </div>
                )}
              </div>

              {/* Students - Compact */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">นักเรียน ({booking.students.length} คน)</h4>
                {booking.students.map((student, idx) => (
                  <div key={idx} className="pl-4 border-l-2 border-gray-200 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{student.name}</span>
                      {student.schoolName && (
                        <span className="text-xs text-gray-500">
                          - {student.schoolName} {student.gradeLevel && `(${student.gradeLevel})`}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {student.subjectInterests.map(subjectId => {
                        const subject = subjects.find(s => s.id === subjectId);
                        return subject ? (
                          <Badge key={subjectId} variant="outline" className="text-xs h-5">
                            {subject.name}
                          </Badge>
                        ) : null;
                      })}
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
                        <TableHead>วันที่</TableHead>
                        <TableHead>เวลา</TableHead>
                        <TableHead>ครู</TableHead>
                        <TableHead>สาขา/ห้อง</TableHead>
                        <TableHead className="text-center">สถานะ</TableHead>
                        <TableHead className="text-right">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => {
                        const subject = subjects.find(s => s.id === session.subjectId);
                        const teacher = teachers.find(t => t.id === session.teacherId);
                        const branch = branches.find(b => b.id === session.branchId);
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
                            <TableCell>{formatDate(session.scheduledDate)}</TableCell>
                            <TableCell>{session.startTime} - {session.endTime}</TableCell>
                            <TableCell>ครู{teacher?.nickname || teacher?.name}</TableCell>
                            <TableCell>{branch?.name} (ห้อง {session.roomId})</TableCell>
                            <TableCell className="text-center">
                              <Badge className={
                                session.status === 'scheduled' ? 'bg-purple-100 text-purple-700' :
                                session.status === 'attended' ? 'bg-green-100 text-green-700' :
                                session.status === 'absent' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }>
                                {session.status === 'scheduled' ? 'นัดหมายแล้ว' :
                                 session.status === 'attended' ? 'เข้าเรียนแล้ว' :
                                 session.status === 'absent' ? 'ไม่มาเรียน' :
                                 'ยกเลิก'}
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
                                  
                                  {session.status === 'scheduled' && isPast && (
                                    <DropdownMenuItem>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      บันทึกการเข้าเรียน
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {session.status === 'attended' && !session.converted && (
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setSelectedSession(session);
                                        setConvertModalOpen(true);
                                      }}
                                      className="text-green-600"
                                    >
                                      <UserPlus className="h-4 w-4 mr-2" />
                                      แปลงเป็นนักเรียน
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {session.status === 'scheduled' && !isPast && (
                                    <>
                                      <DropdownMenuItem>
                                        <Edit className="h-4 w-4 mr-2" />
                                        แก้ไขนัดหมาย
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-red-600">
                                        <XCircle className="h-4 w-4 mr-2" />
                                        ยกเลิกนัดหมาย
                                      </DropdownMenuItem>
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
    </div>
  );
}