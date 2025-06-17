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
  BookOpen,
  Users2,
  School,
  UserPlus,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { getEnrollmentsByClass } from '@/lib/services/enrollments';
import { Student } from '@/types/models';
import { getStudentsByParent } from '@/lib/services/parents';
import { updateClassSchedule } from '@/lib/services/classes';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MakeupClassDialog from '@/components/classes/makeup-class-dialog';
import { getMakeupClass, recordMakeupAttendance, updateMakeupAttendance } from '@/lib/services/makeup';
import { getTrialSession, updateTrialSession } from '@/lib/services/trial-bookings';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

import ConvertToStudentDialog from '@/components/trial/convert-to-student-dialog';

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
  lineDisplayName?: string;
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
  const [trialInfo, setTrialInfo] = useState<any>(null);
  const [loadingMakeup, setLoadingMakeup] = useState(false);
  const [actualTeacherId, setActualTeacherId] = useState<string>('');
  const [originalTeacherId, setOriginalTeacherId] = useState<string>(''); // เพิ่มตัวแปรเก็บครูประจำคลาส
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  
  // For Makeup attendance
  const [makeupAttendance, setMakeupAttendance] = useState<'present' | 'absent' | ''>('');
  const [makeupNote, setMakeupNote] = useState('');
  
  // For Trial attendance
  const [trialAttendance, setTrialAttendance] = useState<'attended' | 'absent' | ''>('');
  const [trialFeedback, setTrialFeedback] = useState('');
  const [trialInterest, setTrialInterest] = useState<'high' | 'medium' | 'low' | 'not_interested' | ''>('');
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  // For convert dialog
  const [trialBooking, setTrialBooking] = useState<any>(null);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);

  const [trialSubjectName, setTrialSubjectName] = useState<string>('');

  // For reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (open && event) {
      // Check event type and load appropriate data
      if (event.extendedProps.type === 'makeup') {
        loadMakeupInfo();
      } else if (event.extendedProps.type === 'trial') {
        loadTrialInfo();
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
      const scheduleDoc = await import('@/lib/services/classes')
        .then(m => m.getClassSchedule(event.classId, scheduleId));
      
      if (scheduleDoc?.actualTeacherId) {
        setActualTeacherId(scheduleDoc.actualTeacherId);
      } else {
        const classModule = await import('@/lib/services/classes');
        const classData = await classModule.getClass(event.classId);
        setActualTeacherId(classData?.teacherId || '');
        setOriginalTeacherId(classData?.teacherId || ''); // บันทึกครูประจำคลาส
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
      const makeupId = event.id.replace('makeup-', '');
      const makeup = await getMakeupClass(makeupId);
      setMakeupInfo(makeup);
      
      // Set attendance if already recorded
      if (makeup?.attendance) {
        setMakeupAttendance(makeup.attendance.status);
        setMakeupNote(makeup.attendance.note || '');
      }
    } catch (error) {
      console.error('Error loading makeup info:', error);
    } finally {
      setLoadingMakeup(false);
    }
  };

  const loadTrialInfo = async () => {
    if (!event) return;
    
    setLoadingMakeup(true);
    try {
      const trialId = event.id.replace('trial-', '');
      const trial = await getTrialSession(trialId);
      
      // Get booking info for parent details
      if (trial) {
        const { getTrialBooking } = await import('@/lib/services/trial-bookings');
        const booking = await getTrialBooking(trial.bookingId);
        
        // Get subject name
        const { getSubject } = await import('@/lib/services/subjects');
        const subject = await getSubject(trial.subjectId);
        if (subject) {
          setTrialSubjectName(subject.name);
        }
        
        // Store both trial and booking info
        setTrialInfo(trial);
        setTrialBooking(booking);
      }
      
      // Set attendance if already recorded
      if (trial?.status === 'attended' || trial?.status === 'absent') {
        setTrialAttendance(trial.status);
        setTrialFeedback(trial.feedback || '');
        setTrialInterest(trial.interestedLevel || '');
      }
    } catch (error) {
      console.error('Error loading trial info:', error);
    } finally {
      setLoadingMakeup(false);
    }
  };

  const loadStudents = async () => {
    if (!event || event.extendedProps.type !== 'class') return;
    
    setLoading(true);
    try {
      const enrollments = await getEnrollmentsByClass(event.classId);
      
      const studentPromises = enrollments
        .filter(e => e.status === 'active')
        .map(async (enrollment) => {
          const parent = await import('@/lib/services/parents').then(m => m.getParent(enrollment.parentId));
          const students = await getStudentsByParent(enrollment.parentId);
          const student = students.find(s => s.id === enrollment.studentId);
          
          if (student && parent) {
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
    
    if (status === 'none') {
      newRecords.delete(studentId);
    } else {
      newRecords.set(studentId, status);
    }
    setAttendanceRecords(newRecords);
  };

  const handleSaveAttendance = async () => {
    if (!event || event.extendedProps.type !== 'class') return;
    
    setSaving(true);
    try {
      const attendanceArray = Array.from(attendanceRecords.entries()).map(([studentId, status]) => ({
        studentId,
        status: status as 'present' | 'absent' | 'late',
        note: ''
      }));
      
      const updateData: any = {
        attendance: attendanceArray,
        status: attendanceArray.length > 0 ? 'completed' : 'scheduled'
      };
      
      if (actualTeacherId) {
        updateData.actualTeacherId = actualTeacherId;
      }
      
      await updateClassSchedule(event.classId, scheduleId, updateData);
      
      // Auto-manage makeup classes after saving
      const currentUser = auth.currentUser;
      if (currentUser) {
        const { getMakeupByOriginalSchedule, deleteMakeupForSchedule, createMakeupRequest } = 
          await import('@/lib/services/makeup');
        
        // Get previous attendance data
        const scheduleDoc = await import('@/lib/services/classes')
          .then(m => m.getClassSchedule(event.classId, scheduleId));
        
        const previousAttendance = new Map<string, string>();
        if (scheduleDoc?.attendance) {
          scheduleDoc.attendance.forEach(att => {
            previousAttendance.set(att.studentId, att.status);
          });
        }
        
        // Process each student's attendance
        for (const student of students) {
          const previousStatus = previousAttendance.get(student.id);
          const currentStatus = attendanceRecords.get(student.id);
          
          const existingMakeup = await getMakeupByOriginalSchedule(
            student.id,
            event.classId,
            scheduleId
          );
          
          // If changed from absent to present/late, delete makeup
          if (previousStatus === 'absent' && 
              (currentStatus === 'present' || currentStatus === 'late')) {
            if (existingMakeup) {
              await deleteMakeupForSchedule(
                student.id,
                event.classId,
                scheduleId,
                currentUser.uid,
                'นักเรียนมาเรียนตามปกติ'
              );
            }
          }
          
          // If marked as absent, create makeup request
          if (currentStatus === 'absent' && !existingMakeup) {
            await createMakeupRequest({
              type: 'ad-hoc',
              originalClassId: event.classId,
              originalScheduleId: scheduleId,
              studentId: student.id,
              parentId: student.parentId,
              requestDate: new Date(),
              requestedBy: currentUser.uid,
              reason: 'ขาดเรียน (บันทึกโดยระบบ)',
              status: 'pending'
            });
          }
        }
      }
      
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

  const handleSaveMakeupAttendance = async () => {
    if (!makeupInfo || !makeupAttendance) return;
    
    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');
      
      // Check if already has attendance
      if (makeupInfo.attendance) {
        // Update existing attendance
        await updateMakeupAttendance(makeupInfo.id, {
          status: makeupAttendance,
          checkedBy: currentUser.uid,
          note: makeupNote
        });
      } else {
        // Record new attendance
        await recordMakeupAttendance(makeupInfo.id, {
          status: makeupAttendance,
          checkedBy: currentUser.uid,
          note: makeupNote
        });
      }
      
      toast.success('บันทึกการเข้าเรียน Makeup Class เรียบร้อยแล้ว');
      onAttendanceSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving makeup attendance:', error);
      toast.error('ไม่สามารถบันทึกการเข้าเรียนได้');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTrialAttendance = async () => {
    if (!trialInfo || !trialAttendance) return;
    
    setSaving(true);
    try {
      const updateData: any = {
        status: trialAttendance,
        feedback: trialFeedback,
        attended: trialAttendance === 'attended'
      };
      
      // Only add interestedLevel if it has a value
      if (trialInterest) {
        updateData.interestedLevel = trialInterest;
      }
      
      await updateTrialSession(trialInfo.id, updateData);
      
      toast.success('บันทึกการเข้าเรียนทดลองเรียบร้อยแล้ว');
      
      // If attended, show modern confirmation dialog
      if (trialAttendance === 'attended' && !trialInfo.converted) {
        setShowConvertConfirm(true);
      } else {
        onAttendanceSaved?.();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error saving trial attendance:', error);
      toast.error('ไม่สามารถบันทึกการเข้าเรียนได้');
    } finally {
      setSaving(false);
    }
  };

  const handleMakeupCreated = async () => {
    // Do nothing - no need to save attendance here
  };

  const handleViewMakeupDetail = () => {
    if (makeupInfo) {
      router.push(`/makeup/${makeupInfo.id}`);
      onOpenChange(false);
    }
  };

  // เพิ่ม function handleViewTrialDetail ที่หายไป
  const handleViewTrialDetail = () => {
    if (trialInfo && trialInfo.bookingId) {
      router.push(`/trial/${trialInfo.bookingId}`);
      onOpenChange(false);
    }
  };

const handleReschedule = () => {
  if (event?.extendedProps.type === 'makeup' && makeupInfo) {
    router.push(`/makeup/${makeupInfo.id}?action=reschedule`);
    onOpenChange(false);
  } else if (event?.extendedProps.type === 'trial' && trialInfo) {
    // ส่ง action=reschedule เพื่อให้ reschedule dialog เปิดอัตโนมัติ
    router.push(`/trial/${trialInfo.bookingId}?action=reschedule&sessionId=${trialInfo.id}`);
    onOpenChange(false);
  }
};

  // Check if event is past
  const isPastEvent = () => {
    if (!event) return false;
    const eventEnd = event.end as Date;
    const now = new Date();
    return eventEnd < now;
  };

  // Reset attendance data
  const handleResetAttendance = async () => {
    if (!event) return;
    
    setResetting(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');
      
      if (event.extendedProps.type === 'class') {
        // Get all makeup classes created for this schedule
        const { getMakeupClassesByClass, deleteMakeupClass } = await import('@/lib/services/makeup');
        const makeupClasses = await getMakeupClassesByClass(event.classId);
        
        // Delete makeup classes that were created for this schedule
        for (const makeup of makeupClasses) {
          if (makeup.originalScheduleId === scheduleId && makeup.status === 'pending') {
            await deleteMakeupClass(makeup.id, currentUser.uid, 'ล้างข้อมูลการเช็คชื่อ');
          }
        }
        
        // Reset regular class attendance
        await updateClassSchedule(event.classId, scheduleId, {
          attendance: [],
          status: 'scheduled',
          actualTeacherId: null
        });
        
        // Clear local state
        setAttendanceRecords(new Map());
        await loadStudents(); // Reload students
        
      } else if (event.extendedProps.type === 'makeup' && makeupInfo) {
        // Reset makeup attendance
        const { revertMakeupToScheduled } = await import('@/lib/services/makeup');
        await revertMakeupToScheduled(
          makeupInfo.id,
          currentUser.uid,
          'แก้ไขข้อมูลการเข้าเรียน'
        );
        
        // Clear local state
        setMakeupAttendance('');
        setMakeupNote('');
        await loadMakeupInfo(); // Reload makeup info
        
      } else if (event.extendedProps.type === 'trial' && trialInfo) {
        // Reset trial attendance
        const { deleteField } = await import('firebase/firestore');
        await updateTrialSession(trialInfo.id, {
          status: 'scheduled',
          feedback: '',
          interestedLevel: deleteField() as any, // Remove field instead of undefined
          attended: false
        });
        
        // Clear local state
        setTrialAttendance('');
        setTrialFeedback('');
        setTrialInterest('');
        await loadTrialInfo(); // Reload trial info
      }
      
      toast.success('ล้างข้อมูลเรียบร้อยแล้ว');
      setShowResetConfirm(false);
      onAttendanceSaved?.();
      
    } catch (error) {
      console.error('Error resetting attendance:', error);
      toast.error('ไม่สามารถล้างข้อมูลได้');
    } finally {
      setResetting(false);
    }
  };

  // Check if can show reset button
  const canShowResetButton = () => {
    if (event?.extendedProps.type === 'class') {
      return attendanceRecords.size > 0;
    } else if (event?.extendedProps.type === 'makeup') {
      return makeupInfo?.status === 'completed' || makeupInfo?.attendance;
    } else if (event?.extendedProps.type === 'trial') {
      return trialInfo?.status === 'attended' || trialInfo?.status === 'absent';
    }
    return false;
  };

  if (!event) return null;

  const isMakeup = event.extendedProps.type === 'makeup';
  const isTrial = event.extendedProps.type === 'trial';
  const eventDate = event.start as Date;

  // Status color and icon
  const getStatusBadge = () => {
    const eventDate = event.start as Date;
    const eventEndDate = event.end as Date;
    const now = new Date();
    const isPast = eventEndDate < now;
    
    if (isMakeup) {
      // ถ้าเป็น Makeup ที่ผ่านมาแล้ว
      if (isPast || event.extendedProps.makeupStatus === 'completed') {
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            เรียนเสร็จแล้ว
          </Badge>
        );
      }
      return (
        <Badge className="bg-purple-100 text-purple-700">
          <UserCircle className="h-3 w-3 mr-1" />
          Makeup Class
        </Badge>
      );
    } else if (isTrial) {
      // ถ้าเป็น Trial ที่ผ่านมาแล้ว
      if (isPast) {
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            ทดลองเรียนเสร็จแล้ว
          </Badge>
        );
      }
      return (
        <Badge className="bg-orange-100 text-orange-700">
          <School className="h-3 w-3 mr-1" />
          ทดลองเรียน
        </Badge>
      );
    } else if (isPast || event.extendedProps.status === 'completed') {
      // คลาสปกติที่ผ่านมาแล้ว หรือมีสถานะ completed
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
        <Badge className="bg-gray-100 text-gray-700">
          <Calendar className="h-3 w-3 mr-1" />
          ตามตาราง
        </Badge>
      );
    }
  };

  // Get title based on event type  
  const getEventTitle = () => {
    if (isMakeup) {
      return `${event.extendedProps.originalClassName} - Makeup`;
    } else if (isTrial) {
      // Use loaded subject name or fallback to event props
      return trialSubjectName || event.extendedProps.trialSubjectName || 'ทดลองเรียน';
    } else {
      return event.title.split(' - ')[0];
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {/* Subject color dot */}
                  {event.extendedProps.subjectColor && (
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: event.extendedProps.subjectColor }}
                    />
                  )}
                  <DialogTitle className="text-xl">
                    {getEventTitle()}
                    {event.extendedProps.sessionNumber && !isMakeup && !isTrial && (
                      <span className="ml-2">ครั้งที่ {event.extendedProps.sessionNumber}</span>
                    )}
                  </DialogTitle>
                </div>
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
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* For Trial Classes */}
            {isTrial ? (
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

                {/* Trial Class Details */}
                {!loadingMakeup && trialInfo && (
                  <div className="space-y-4">
                    <div className="p-4 bg-orange-50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-orange-900">ข้อมูลทดลองเรียน</h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleViewTrialDetail}
                          className="text-orange-600"
                        >
                          ดูรายละเอียด
                        </Button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Users2 className="h-4 w-4 text-orange-600" />
                          <span className="text-orange-700">
                            นักเรียน: {trialInfo.studentName || event.extendedProps.trialStudentName}
                          </span>
                        </div>
                       
                        {trialBooking && (
                          <>
                            {trialBooking.parentName && (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-orange-600" />
                                <span className="text-orange-700">
                                  ผู้ปกครอง: {trialBooking.parentName}
                                </span>
                              </div>
                            )}
                            {trialBooking.parentPhone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-orange-600" />
                                <span className="text-orange-700">
                                  โทร: {trialBooking.parentPhone}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Trial Attendance */}
                    <div className="space-y-4 p-4 border rounded-lg">
                      <h4 className="font-medium">บันทึกการเข้าเรียนทดลอง</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <Label>สถานะการเข้าเรียน</Label>
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant={trialAttendance === 'attended' ? 'default' : 'outline'}
                              className={trialAttendance === 'attended' ? 'bg-green-500 hover:bg-green-600' : ''}
                              onClick={() => setTrialAttendance('attended')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              มาเรียน
                            </Button>
                            <Button
                              size="sm"
                              variant={trialAttendance === 'absent' ? 'default' : 'outline'}
                              className={trialAttendance === 'absent' ? 'bg-red-500 hover:bg-red-600' : ''}
                              onClick={() => setTrialAttendance('absent')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              ไม่มาเรียน
                            </Button>
                          </div>
                        </div>

                        {trialAttendance === 'attended' && (
                          <>
                            <div>
                              <Label>ระดับความสนใจ</Label>
                              <Select value={trialInterest} onValueChange={(value: any) => setTrialInterest(value)}>
                                <SelectTrigger className="mt-2">
                                  <SelectValue placeholder="เลือกระดับความสนใจ" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="high">สนใจมาก</SelectItem>
                                  <SelectItem value="medium">สนใจปานกลาง</SelectItem>
                                  <SelectItem value="low">สนใจน้อย</SelectItem>
                                  <SelectItem value="not_interested">ไม่สนใจ</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Feedback / หมายเหตุ</Label>
                              <Textarea
                                placeholder="บันทึกความเห็นหลังทดลองเรียน..."
                                value={trialFeedback}
                                onChange={(e) => setTrialFeedback(e.target.value)}
                                className="mt-2"
                                rows={3}
                              />
                            </div>
                          </>
                        )}
                        
                        {/* Show existing data if already recorded */}
                        {(trialInfo.status === 'attended' || trialInfo.status === 'absent') && (
                          <div className="p-3 bg-gray-100 rounded-lg text-sm">
                            <p className="font-medium">บันทึกการเข้าเรียนแล้ว</p>
                            <p className="text-gray-600 mt-1">
                              สถานะ: {trialInfo.status === 'attended' ? 'มาเรียน' : 'ไม่มาเรียน'}
                            </p>
                            {trialInfo.interestedLevel && (
                              <p className="text-gray-600">
                                ระดับความสนใจ: {
                                  trialInfo.interestedLevel === 'high' ? 'สนใจมาก' :
                                  trialInfo.interestedLevel === 'medium' ? 'สนใจปานกลาง' :
                                  trialInfo.interestedLevel === 'low' ? 'สนใจน้อย' : 'ไม่สนใจ'
                                }
                              </p>
                            )}
                            {trialInfo.feedback && (
                              <p className="text-gray-600">Feedback: {trialInfo.feedback}</p>
                            )}
                            {trialInfo.status === 'absent' && (
                              <div className="mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleReschedule}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Calendar className="h-4 w-4 mr-1" />
                                  นัดวันใหม่
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : isMakeup ? (
              <>
                {/* Makeup Class Details */}
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

                {!loadingMakeup && makeupInfo && (
                  <div className="space-y-4">
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

                    {/* Makeup Attendance */}
                    <div className="space-y-4 p-4 border rounded-lg">
                      <h4 className="font-medium">บันทึกการเข้าเรียน Makeup</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <Label>สถานะการเข้าเรียน</Label>
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant={makeupAttendance === 'present' ? 'default' : 'outline'}
                              className={makeupAttendance === 'present' ? 'bg-green-500 hover:bg-green-600' : ''}
                              onClick={() => setMakeupAttendance('present')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              มาเรียน
                            </Button>
                            <Button
                              size="sm"
                              variant={makeupAttendance === 'absent' ? 'default' : 'outline'}
                              className={makeupAttendance === 'absent' ? 'bg-red-500 hover:bg-red-600' : ''}
                              onClick={() => setMakeupAttendance('absent')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              ไม่มาเรียน
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label>หมายเหตุ</Label>
                          <Textarea
                            placeholder="บันทึกหมายเหตุ..."
                            value={makeupNote}
                            onChange={(e) => setMakeupNote(e.target.value)}
                            className="mt-2"
                            rows={3}
                          />
                        </div>

                        {makeupInfo.status === 'completed' && makeupInfo.attendance && (
                          <div className="p-3 bg-gray-100 rounded-lg text-sm">
                            <p className="font-medium">บันทึกการเข้าเรียนแล้ว</p>
                            <p className="text-gray-600 mt-1">
                              สถานะ: {makeupInfo.attendance.status === 'present' ? 'มาเรียน' : 'ไม่มาเรียน'}
                            </p>
                            {makeupInfo.attendance.note && (
                              <p className="text-gray-600">หมายเหตุ: {makeupInfo.attendance.note}</p>
                            )}
                            {makeupInfo.attendance.status === 'absent' && (
                              <div className="mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleReschedule}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Calendar className="h-4 w-4 mr-1" />
                                  นัดวันใหม่
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
                              {/* แก้ไขการแสดง - เช็คครูประจำคลาสจาก originalTeacherId */}
                              {teacher.id === originalTeacherId && ' (ครูประจำคลาส)'}
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
          <div className="flex justify-between gap-2 pt-4 border-t">
            <div className="flex gap-2">
              {/* Reset button - show only if has data */}
              {canShowResetButton() && (
                <Button
                  variant="ghost"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={saving || resetting}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  ล้างข้อมูล
                </Button>
              )}
              
              {/* Reschedule button for makeup/trial that marked as absent */}
              {((event.extendedProps.type === 'makeup' && makeupAttendance === 'absent') || 
                (event.extendedProps.type === 'trial' && trialAttendance === 'absent')) && (
                <Button
                  variant="outline"
                  onClick={handleReschedule}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  นัดวันใหม่
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                ปิด
              </Button>
              
              {/* Save button for Trial */}
              {isTrial && trialInfo && trialAttendance && (
                <Button 
                  onClick={handleSaveTrialAttendance}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการเข้าเรียน'}
                </Button>
              )}
              
              {/* Save button for Makeup */}
              {isMakeup && makeupInfo && makeupAttendance && (
                <Button 
                  onClick={handleSaveMakeupAttendance}
                  disabled={saving}
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการเข้าเรียน'}
                </Button>
              )}
              
              {/* Save button for Regular Class */}
              {!isMakeup && !isTrial && students.length > 0 && (
                <Button 
                  onClick={handleSaveAttendance}
                  disabled={saving || attendanceRecords.size === 0}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {saving ? 'กำลังบันทึก...' : `บันทึกการเช็คชื่อ (${attendanceRecords.size})`}
                </Button>
              )}
            </div>
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

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <AlertDialogTitle>ยืนยันการล้างข้อมูล</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  {event.extendedProps.type === 'class' 
                    ? 'คุณต้องการล้างข้อมูลการเช็คชื่อทั้งหมดใช่หรือไม่?'
                    : event.extendedProps.type === 'makeup'
                    ? 'คุณต้องการล้างข้อมูลการเข้าเรียน Makeup Class ใช่หรือไม่?'
                    : 'คุณต้องการล้างข้อมูลการเข้าเรียนทดลองใช่หรือไม่?'
                  }
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p className="font-medium mb-1">หมายเหตุ:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>ข้อมูลที่บันทึกไว้จะถูกลบทั้งหมด</li>
              <li>สามารถบันทึกข้อมูลใหม่ได้หลังจากล้าง</li>
              {event.extendedProps.type === 'class' && (
                <li>Makeup request ที่สร้างไว้จะถูกลบด้วย</li>
              )}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetAttendance}
              className="bg-gray-600 hover:bg-gray-700"
              disabled={resetting}
            >
              {resetting ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-1 animate-spin" />
                  กำลังล้าง...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1" />
                  ล้างข้อมูล
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modern Confirmation Dialog for Convert */}
      <AlertDialog open={showConvertConfirm} onOpenChange={setShowConvertConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <AlertDialogTitle>ต้องการสมัครเรียนต่อหรือไม่?</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  นักเรียน <span className="font-semibold">{trialInfo?.studentName}</span> ทดลองเรียนเรียบร้อยแล้ว
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <div className="p-3 bg-orange-50 rounded-lg text-sm">
              <p className="font-medium text-orange-900 mb-1">ข้อมูลการทดลองเรียน:</p>
              <div className="space-y-1 text-orange-700">
                <p>• วิชา: {trialSubjectName || event?.extendedProps.trialSubjectName || 'กำลังโหลด...'}</p>
                {trialInterest && (
                  <p>• ระดับความสนใจ: {
                    trialInterest === 'high' ? 'สนใจมาก' :
                    trialInterest === 'medium' ? 'สนใจปานกลาง' :
                    trialInterest === 'low' ? 'สนใจน้อย' : 'ไม่สนใจ'
                  }</p>
                )}
                {trialFeedback && <p>• Feedback: {trialFeedback}</p>}
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              toast.info('สามารถสมัครเรียนได้ภายหลังที่หน้าทดลองเรียน');
              onAttendanceSaved?.();
              onOpenChange(false);
            }}>
              สมัครภายหลัง
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowConvertConfirm(false);
                setShowConvertDialog(true);
              }}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              สมัครเรียนเลย
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Student Dialog for Trial */}
      {trialInfo && trialBooking && (
        <ConvertToStudentDialog
          isOpen={showConvertDialog}
          onClose={() => {
            setShowConvertDialog(false);
            onAttendanceSaved?.();
            onOpenChange(false);
          }}
          booking={trialBooking}
          session={trialInfo}
          onSuccess={() => {
            toast.success('แปลงเป็นนักเรียนเรียบร้อยแล้ว');
            setShowConvertDialog(false);
            onAttendanceSaved?.();
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}