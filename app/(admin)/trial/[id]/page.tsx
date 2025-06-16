// app/(admin)/trial/[id]/page.tsx

'use client';

import { useState, useEffect } from 'react';
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
  UserPlus
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
import TrialSessionCard from '@/components/trial/trial-session-card';
import ContactHistorySection from '@/components/trial/contact-history-section';
import ConvertToStudentDialog from '@/components/trial/convert-to-student-dialog';

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

export default function TrialBookingDetailPage({ params }: { params: { id: string } }) {
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
  }, [params.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bookingData, subjectsData, teachersData, branchesData] = await Promise.all([
        getTrialBooking(params.id),
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
      const sessionsData = await getTrialSessionsByBooking(params.id);
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
          {/* Parent Information */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลผู้ปกครอง</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{booking.parentName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{booking.parentPhone}</span>
              </div>
              {booking.parentEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{booking.parentEmail}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Students */}
          <Card>
            <CardHeader>
              <CardTitle>นักเรียน ({booking.students.length} คน)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.students.map((student, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="font-medium">{student.name}</div>
                  {student.schoolName && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <School className="h-3 w-3" />
                      {student.schoolName}
                      {student.gradeLevel && ` (${student.gradeLevel})`}
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-gray-500">วิชาที่สนใจ:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {student.subjectInterests.map(subjectId => {
                        const subject = subjects.find(s => s.id === subjectId);
                        return subject ? (
                          <Badge key={subjectId} variant="outline" className="text-xs">
                            {subject.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Trial Sessions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>การทดลองเรียน</CardTitle>
                  <CardDescription>
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
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <TrialSessionCard
                      key={session.id}
                      session={session}
                      subjects={subjects}
                      teachers={teachers}
                      branches={branches}
                      onUpdate={handleSessionUpdated}
                      onConvert={(session) => {
                        setSelectedSession(session);
                        setConvertModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Actions & History */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>การดำเนินการ</CardTitle>
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
              
              {booking.status === 'contacted' && sessions.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    กรุณานัดหมายทดลองเรียนให้กับนักเรียน
                  </AlertDescription>
                </Alert>
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