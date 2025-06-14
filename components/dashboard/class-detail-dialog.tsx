'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarEvent } from '@/lib/services/dashboard';
import { formatDate } from '@/lib/utils';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone,
  CheckCircle,
  AlertCircle,
  XCircle,
  UserCircle,
  BookOpen
} from 'lucide-react';
import { getEnrollmentsByClass } from '@/lib/services/enrollments';
import { Student } from '@/types/models';
import { getStudentsByParent } from '@/lib/services/parents';
import { updateClassSchedule } from '@/lib/services/classes';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MakeupClassDialog from '@/components/classes/makeup-class-dialog';
import { getMakeupClass } from '@/lib/services/makeup';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClassDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  scheduleId: string;
  onAttendanceSaved?: () => void;
}

interface StudentWithAttendance extends Student {
  parentName: string;
  parentPhone: string;
  enrollmentId: string;
  attendance?: {
    status: 'present' | 'absent' | 'late';
    note?: string;
  };
}

export default function ClassDetailDialog({ 
  open, 
  onOpenChange, 
  event,
  scheduleId,
  onAttendanceSaved
}: ClassDetailDialogProps) {
  const router = useRouter();
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, string>>(new Map());
  const [selectedStudent, setSelectedStudent] = useState<StudentWithAttendance | null>(null);
  const [showMakeupDialog, setShowMakeupDialog] = useState(false);
  const [makeupInfo, setMakeupInfo] = useState<any>(null);
  const [loadingMakeup, setLoadingMakeup] = useState(false);
  const [actualTeacherId, setActualTeacherId] = useState<string>('');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  useEffect(() => {
    if (open && event) {
      // Check if it's a makeup class
      if (event.extendedProps.type === 'makeup') {
        loadMakeupInfo();
      } else {
        loadStudents();
        loadTeachers();
      }
    }
  }, [open, event]);

  const loadTeachers = async () => {
    if (!event) return;
    
    setLoadingTeachers(true);
    try {
      const teachersModule = await import('@/lib/services/teachers');
      const allTeachers = await teachersModule.getActiveTeachers();
      setTeachers(allTeachers);
      
      // Set default teacher from class
      // Check if actualTeacherId is already set in the schedule
      const scheduleDoc = await import('@/lib/services/classes')
        .then(m => m.getClassSchedule(event.classId, scheduleId));
      
      if (scheduleDoc?.actualTeacherId) {
        setActualTeacherId(scheduleDoc.actualTeacherId);
      } else {
        // Default to class teacher
        const classModule = await import('@/lib/services/classes');
        const classData = await classModule.getClass(event.classId);
        setActualTeacherId(classData?.teacherId || '');
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const loadMakeupInfo = async () => {
    if (!event) return;
    
    setLoadingMakeup(true);
    try {
      // Extract makeup ID from event ID (format: makeup-{id})
      const makeupId = event.id.replace('makeup-', '');
      const makeup = await getMakeupClass(makeupId);
      setMakeupInfo(makeup);
    } catch (error) {
      console.error('Error loading makeup info:', error);
    } finally {
      setLoadingMakeup(false);
    }
  };

  const loadStudents = async () => {
    if (!event || event.extendedProps.type === 'makeup') return;
    
    setLoading(true);
    try {
      // Get enrollments for this class
      const enrollments = await getEnrollmentsByClass(event.classId);
      
      // Get student details for each enrollment
      const studentPromises = enrollments
        .filter(e => e.status === 'active')
        .map(async (enrollment) => {
          const parent = await import('@/lib/services/parents').then(m => m.getParent(enrollment.parentId));
          const students = await getStudentsByParent(enrollment.parentId);
          const student = students.find(s => s.id === enrollment.studentId);
          
          if (student && parent) {
            // Get attendance status from the schedule
            const scheduleDoc = await import('@/lib/services/classes')
              .then(m => m.getClassSchedule(event.classId, scheduleId));
            
            const attendanceRecord = scheduleDoc?.attendance?.find(
              a => a.studentId === student.id
            );
            
            return {
              ...student,
              parentName: parent.displayName,
              parentPhone: parent.phone,
              enrollmentId: enrollment.id,
              attendance: attendanceRecord
            } as StudentWithAttendance;
          }
          return null;
        });
      
      const studentsData = (await Promise.all(studentPromises)).filter(Boolean) as StudentWithAttendance[];
      setStudents(studentsData);
      
      // Initialize attendance records
      const initialAttendance = new Map<string, string>();
      studentsData.forEach(student => {
        if (student.attendance) {
          initialAttendance.set(student.id, student.attendance.status);
        }
      });
      setAttendanceRecords(initialAttendance);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('ไม่สามารถโหลดข้อมูลนักเรียนได้');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = async (studentId: string, status: string) => {
    const newRecords = new Map(attendanceRecords);
    const previousStatus = attendanceRecords.get(studentId);
    
    if (status === 'none') {
      newRecords.delete(studentId);
    } else {
      newRecords.set(studentId, status);
    }
    setAttendanceRecords(newRecords);
    
    // Auto-manage makeup class when changing attendance status
    if (event && scheduleId) {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        
        // Get student info
        const student = students.find(s => s.id === studentId);
        if (!student) return;
        
        // Import makeup services
        const { getMakeupByOriginalSchedule, deleteMakeupForSchedule, createMakeupRequest } = 
          await import('@/lib/services/makeup');
        
        // Check if makeup exists for this schedule
        const existingMakeup = await getMakeupByOriginalSchedule(
          studentId,
          event.classId,
          scheduleId
        );
        
        // If changing from absent to present/late
        if ((previousStatus === 'absent' || !previousStatus) && 
            (status === 'present' || status === 'late')) {
          if (existingMakeup) {
            // Delete existing makeup
            await deleteMakeupForSchedule(
              studentId,
              event.classId,
              scheduleId,
              currentUser.uid,
              'นักเรียนมาเรียนตามปกติ'
            );
            toast.success('ยกเลิก Makeup Class แล้ว');
          }
        }
        
        // If changing to absent
        if (status === 'absent' && !existingMakeup) {
          // Auto-create makeup request
          await createMakeupRequest({
            type: 'ad-hoc',
            originalClassId: event.classId,
            originalScheduleId: scheduleId,
            studentId: studentId,
            parentId: student.parentId,
            requestDate: new Date(),
            requestedBy: currentUser.uid,
            reason: 'ขาดเรียน (บันทึกโดยระบบ)',
            status: 'pending'
          });
          toast.success('สร้าง Makeup Request อัตโนมัติแล้ว');
        }
      } catch (error) {
        console.error('Error managing makeup:', error);
        // Don't show error to user, just log it
      }
    }
  };

  const handleMarkAbsent = async (student: StudentWithAttendance) => {
    // Mark as absent first
    await handleAttendanceChange(student.id, 'absent');
    
    // Check if makeup already exists
    const { getMakeupByOriginalSchedule } = await import('@/lib/services/makeup');
    const existingMakeup = await getMakeupByOriginalSchedule(
      student.id,
      event!.classId,
      scheduleId
    );
    
    if (!existingMakeup) {
      // Open makeup dialog only if no makeup exists
      setSelectedStudent(student);
      setShowMakeupDialog(true);
    } else {
      toast.info('มี Makeup Request สำหรับวันนี้อยู่แล้ว');
    }
  };

  const handleSaveAttendance = async () => {
    if (!event || event.extendedProps.type === 'makeup') return;
    
    setSaving(true);
    try {
      // Convert attendance records to array format
      const attendanceArray = Array.from(attendanceRecords.entries()).map(([studentId, status]) => ({
        studentId,
        status: status as 'present' | 'absent' | 'late',
        note: ''
      }));
      
      // Prepare update data
      const updateData: any = {
        attendance: attendanceArray,
        status: attendanceArray.length > 0 ? 'completed' : 'scheduled'
      };
      
      // Add actual teacher if different from default
      if (actualTeacherId) {
        updateData.actualTeacherId = actualTeacherId;
      }
      
      // Update the schedule with attendance
      await updateClassSchedule(event.classId, scheduleId, updateData);
      
      toast.success('บันทึกการเช็คชื่อเรียบร้อยแล้ว');
      onAttendanceSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('ไม่สามารถบันทึกการเช็คชื่อได้');
    } finally {
      setSaving(false);
    }
  };

  const handleMakeupCreated = async () => {
    // Save attendance after makeup is created
    await handleSaveAttendance();
  };

  const handleViewMakeupDetail = () => {
    if (makeupInfo) {
      router.push(`/makeup/${makeupInfo.id}`);
      onOpenChange(false);
    }
  };

  if (!event) return null;

  const isMakeup = event.extendedProps.type === 'makeup';
  const eventDate = event.start as Date;

  // Status color and icon
  const getStatusBadge = () => {
    if (isMakeup) {
      return (
        <Badge className="bg-purple-100 text-purple-700">
          <UserCircle className="h-3 w-3 mr-1" />
          Makeup Class
        </Badge>
      );
    } else if (event.extendedProps.status === 'completed') {
      return (
        <Badge className="bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          เรียนเสร็จแล้ว
        </Badge>
      );
    } else if (event.extendedProps.status === 'rescheduled') {
      return (
        <Badge className="bg-amber-100 text-amber-700">
          <AlertCircle className="h-3 w-3 mr-1" />
          เลื่อนเวลา
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-blue-100 text-blue-700">
          <Calendar className="h-3 w-3 mr-1" />
          ตามตาราง
        </Badge>
      );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div>
              <DialogTitle className="text-xl">
                {event.title.split(' - ')[0]}
                {event.extendedProps.sessionNumber && (
                  <span className="ml-2">ครั้งที่ {event.extendedProps.sessionNumber}</span>
                )}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">{event.title.split(' - ')[1] || ''}</p>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{formatDate(eventDate, 'full')}</span>
                <Clock className="h-4 w-4 text-gray-400 ml-3" />
                <span className="font-medium">
                  {eventDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })} - 
                  {(event.end as Date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>
            </div>
            {getStatusBadge()}
          </DialogHeader>

          <div className="space-y-4">
            {/* For Makeup Classes - Show details only */}
            {isMakeup ? (
              <>
                {/* Class Details */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      <span className="text-gray-500">ห้อง:</span>{' '}
                      <span className="font-medium">{event.extendedProps.roomName}</span>
                      <span className="text-gray-400 ml-1">({event.extendedProps.branchName})</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      <span className="text-gray-500">ครูผู้สอน:</span>{' '}
                      <span className="font-medium">{event.extendedProps.teacherName}</span>
                    </span>
                  </div>
                </div>

                {/* Makeup Class Details */}
                {!loadingMakeup && makeupInfo && (
                  <div className="p-4 bg-purple-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-purple-900">ข้อมูล Makeup Class</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleViewMakeupDetail}
                        className="text-purple-600"
                      >
                        ดูรายละเอียด
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-purple-600" />
                        <span className="text-purple-700">
                          นักเรียน: {event.extendedProps.studentNickname} ({event.extendedProps.studentName})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-purple-600" />
                        <span className="text-purple-700">
                          คลาสเดิม: {event.extendedProps.originalClassName}
                        </span>
                      </div>
                      {makeupInfo.reason && (
                        <div className="text-purple-700">
                          เหตุผล: {makeupInfo.reason}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* For Regular Classes - Show tabs */
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">รายละเอียด</TabsTrigger>
                  <TabsTrigger value="attendance" disabled={students.length === 0}>
                    เช็คชื่อ ({students.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  {/* Location and Teacher Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>
                        สาขา <span className="font-medium">{event.extendedProps.branchName}</span>
                        <span className="mx-2 text-gray-400">|</span>
                        ห้องเรียน <span className="font-medium">{event.extendedProps.roomName}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>
                        ครู <span className="font-medium">{event.extendedProps.teacherName}</span>
                        {event.extendedProps.enrolled !== undefined && (
                          <>
                            <span className="mx-2 text-gray-400">|</span>
                            นักเรียน <span className="font-medium">{event.extendedProps.enrolled}/{event.extendedProps.maxStudents}</span> คน
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Status Info */}
                  {event.extendedProps.status === 'completed' && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-900">
                          คลาสนี้ได้ทำการเรียนการสอนเสร็จสิ้นแล้ว
                        </span>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="attendance" className="mt-4">
                  <div className="space-y-4">
                    {/* Teacher Selection */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Label htmlFor="actual-teacher" className="text-sm font-medium">ครูผู้สอน</Label>
                      <Select
                        value={actualTeacherId}
                        onValueChange={setActualTeacherId}
                        disabled={loadingTeachers}
                      >
                        <SelectTrigger id="actual-teacher" className="mt-2">
                          <SelectValue placeholder="เลือกครูผู้สอน" />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.nickname || teacher.name}
                              {teacher.id === event.extendedProps.teacherId && ' (ครูประจำคลาส)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Attendance Summary */}
                    {students.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">
                          สถานะการเช็คชื่อ
                        </span>
                        <span className="text-sm text-gray-600">
                          เช็คแล้ว {attendanceRecords.size} จาก {students.length} คน
                        </span>
                      </div>
                    )}

                    {/* Student List */}
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">
                        กำลังโหลดข้อมูลนักเรียน...
                      </div>
                    ) : students.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        ยังไม่มีนักเรียนในคลาสนี้
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {students.map((student) => (
                          <div 
                            key={student.id} 
                            className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{student.nickname}</span>
                                  <span className="text-sm text-gray-500">({student.name})</span>
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {student.parentName} - {student.parentPhone}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={!attendanceRecords.has(student.id) ? 'default' : 'outline'}
                                  className={!attendanceRecords.has(student.id) ? 'bg-gray-500 hover:bg-gray-600' : ''}
                                  onClick={() => handleAttendanceChange(student.id, 'none')}
                                >
                                  ยังไม่เช็ค
                                </Button>
                                <Button
                                  size="sm"
                                  variant={attendanceRecords.get(student.id) === 'present' ? 'default' : 'outline'}
                                  className={attendanceRecords.get(student.id) === 'present' ? 'bg-green-500 hover:bg-green-600' : ''}
                                  onClick={() => handleAttendanceChange(student.id, 'present')}
                                >
                                  มาเรียน
                                </Button>
                                <Button
                                  size="sm"
                                  variant={attendanceRecords.get(student.id) === 'absent' ? 'default' : 'outline'}
                                  className={attendanceRecords.get(student.id) === 'absent' ? 'bg-red-500 hover:bg-red-600' : ''}
                                  onClick={() => handleAttendanceChange(student.id, 'absent')}
                                >
                                  ขาดเรียน
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              ปิด
            </Button>
            {!isMakeup && students.length > 0 && (
              <Button 
                onClick={handleSaveAttendance}
                disabled={saving || attendanceRecords.size === 0}
                className="bg-red-500 hover:bg-red-600"
              >
                {saving ? 'กำลังบันทึก...' : `บันทึกการเช็คชื่อ (${attendanceRecords.size})`}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Makeup Class Dialog */}
      {selectedStudent && event && (
        <MakeupClassDialog
          open={showMakeupDialog}
          onOpenChange={setShowMakeupDialog}
          student={selectedStudent}
          classInfo={{
            id: event.classId,
            name: event.title,
            teacherId: actualTeacherId || '',
            branchId: event.extendedProps.branchId,
            roomId: event.extendedProps.roomName
          }}
          scheduleId={scheduleId}
          sessionDate={eventDate}
          sessionNumber={event.extendedProps.sessionNumber || 1}
          onMakeupCreated={handleMakeupCreated}
        />
      )}
    </>
  );
}