'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageLoading } from '@/components/ui/loading';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  getClass, 
  getClassSchedule, 
  updateClassSchedule
} from '@/lib/services/classes';
import { getEnrollmentsByClass } from '@/lib/services/enrollments';
import { getTeachersByBranch } from '@/lib/services/teachers';
import { createMakeupRequest } from '@/lib/services/makeup';
import { getStudentWithParent } from '@/lib/services/parents';
import { Class, ClassSchedule, Teacher } from '@/types/models';
import { formatDateWithDay, formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ClockIcon as ClockIconOutline,
  Save,
  UserCheck,
  AlertTriangle,
  Copy,
  CheckCheck
} from 'lucide-react';

interface StudentAttendance {
  studentId: string;
  studentName: string;
  studentNickname?: string;
  parentName: string;
  status: 'present' | 'absent' | 'late' | 'sick' | 'leave' | '';
  note: string;
  existingMakeup?: boolean;
}

export default function AttendanceCheckPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;
  const sessionId = params.sessionId as string;
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classData, setClassData] = useState<Class | null>(null);
  const [schedule, setSchedule] = useState<ClassSchedule | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [actualTeacherId, setActualTeacherId] = useState<string>('');
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [globalNote, setGlobalNote] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, [classId, sessionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [cls, sched, enrollments] = await Promise.all([
        getClass(classId),
        getClassSchedule(classId, sessionId),
        getEnrollmentsByClass(classId)
      ]);
      
      if (!cls || !sched) {
        router.push('/attendance');
        return;
      }
      
      setClassData(cls);
      setSchedule(sched);
      
      // Set actual teacher
      setActualTeacherId(sched.actualTeacherId || cls.teacherId);
      
      // Load teachers for the branch
      const branchTeachers = await getTeachersByBranch(cls.branchId);
      setTeachers(branchTeachers);
      
      // Get enrolled student IDs
      const enrolledStudentIds = enrollments.map(e => e.studentId);
      
      // Load student details in parallel
      const studentPromises = enrolledStudentIds.map(async (studentId) => {
        const studentData = await getStudentWithParent(studentId);
        if (!studentData) return null;
        
        // Check existing attendance
        const existingAttendance = sched.attendance?.find(
          att => att.studentId === studentId
        );
        
        return {
          studentId,
          studentName: studentData.name,
          studentNickname: studentData.nickname,
          parentName: studentData.parentName,
          status: existingAttendance?.status || '', // Default to empty string instead of 'present'
          note: existingAttendance?.note || '',
          existingMakeup: false
        } as StudentAttendance;
      });
      
      const studentsWithDetails = await Promise.all(studentPromises);
      
      // Filter out null values and sort by name
      const validStudents = studentsWithDetails
        .filter(s => s !== null) as StudentAttendance[];
      
      validStudents.sort((a, b) => 
        a.studentNickname?.localeCompare(b.studentNickname || '') || 
        a.studentName.localeCompare(b.studentName)
      );
      
      setAttendance(validStudents);
      
      // Set global note if exists
      if (sched.note) {
        setGlobalNote(sched.note);
      }
      
    } catch (error) {
      console.error('Error loading attendance data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      router.push('/attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId: string, status: StudentAttendance['status']) => {
    setAttendance(prev => prev.map(att => 
      att.studentId === studentId ? { ...att, status } : att
    ));
    setHasChanges(true);
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setAttendance(prev => prev.map(att => 
      att.studentId === studentId ? { ...att, note } : att
    ));
    setHasChanges(true);
  };

  const handleMarkAllPresent = () => {
    setAttendance(prev => prev.map(att => ({ ...att, status: 'present' })));
    setHasChanges(true);
  };

  const handleCopyFromPrevious = async () => {
    try {
      // This would load previous session's attendance
      toast.info('ฟีเจอร์นี้กำลังพัฒนา');
    } catch (error) {
      toast.error('ไม่สามารถคัดลอกข้อมูลได้');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Filter out students with empty status
      const attendanceToSave = attendance.filter(att => att.status !== '');
      
      // Prepare attendance data
      const attendanceData = attendanceToSave.map(att => ({
        studentId: att.studentId,
        status: att.status as 'present' | 'absent' | 'late' | 'sick' | 'leave',
        note: att.note,
        checkedAt: new Date(),
        checkedBy: user?.uid || 'system'
      }));
      
      // Update schedule
      await updateClassSchedule(classId, sessionId, {
        actualTeacherId,
        attendance: attendanceData,
        note: globalNote,
        status: attendanceData.length > 0 ? 'completed' : 'scheduled',
        attendanceCompletedAt: attendanceData.length > 0 ? new Date() : undefined,
        attendanceCompletedBy: attendanceData.length > 0 ? (user?.uid || 'system') : undefined
      });
      
      // Get makeup settings
      const { getMakeupSettings } = await import('@/lib/services/settings');
      const { getMakeupCount } = await import('@/lib/services/makeup');
      const makeupSettings = await getMakeupSettings();
      
      // Filter students for makeup based on settings
      const studentsForMakeup = attendanceToSave.filter(att => 
        makeupSettings.allowMakeupForStatuses.includes(att.status as any)
      );
      
      if (makeupSettings.autoCreateMakeup && studentsForMakeup.length > 0) {
        const makeupPromises = studentsForMakeup.map(async (student) => {
          try {
            // Check makeup limit if set
            if (makeupSettings.makeupLimitPerCourse > 0) {
              const currentCount = await getMakeupCount(student.studentId, classId);
              if (currentCount >= makeupSettings.makeupLimitPerCourse) {
                console.log(`Student ${student.studentId} reached makeup limit (${currentCount}/${makeupSettings.makeupLimitPerCourse})`);
                toast.warning(`${student.studentNickname || student.studentName} เกินจำนวนครั้งที่ชดเชยได้แล้ว`);
                return;
              }
            }
            
            const studentData = await getStudentWithParent(student.studentId);
            if (studentData) {
              return createMakeupRequest({
                type: 'ad-hoc',
                originalClassId: classId,
                originalScheduleId: sessionId,
                studentId: student.studentId,
                parentId: studentData.parentId,
                requestDate: new Date(),
                requestedBy: 'system',
                reason: `${student.status === 'sick' ? 'ป่วย' : student.status === 'leave' ? 'ลา' : 'ขาดเรียน'} - สร้างอัตโนมัติจากการเช็คชื่อ`,
                status: 'pending',
                originalSessionNumber: schedule?.sessionNumber,
                originalSessionDate: schedule?.sessionDate
              });
            }
          } catch (error) {
            console.error('Error creating makeup for student:', student.studentId, error);
          }
        });
        
        await Promise.all(makeupPromises);
      }
      
      toast.success('บันทึกการเช็คชื่อเรียบร้อยแล้ว');
      router.push(`/attendance/${classId}`);
      
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const getAttendanceStats = () => {
    const checkedStudents = attendance.filter(a => a.status !== '');
    const stats = {
      total: attendance.length,
      checked: checkedStudents.length,
      present: checkedStudents.filter(a => a.status === 'present').length,
      absent: checkedStudents.filter(a => a.status === 'absent').length,
      late: checkedStudents.filter(a => a.status === 'late').length,
      sick: checkedStudents.filter(a => a.status === 'sick').length,
      leave: checkedStudents.filter(a => a.status === 'leave').length,
    };
    
    return stats;
  };

  const getStatusButton = (status: StudentAttendance['status']) => {
    const configs = {
      present: { 
        label: 'มา', 
        icon: CheckCircle, 
        color: 'text-green-600 bg-green-50 hover:bg-green-100',
        activeColor: 'text-white bg-green-600 hover:bg-green-700 ring-2 ring-green-600 ring-offset-2'
      },
      absent: { 
        label: 'ขาด', 
        icon: XCircle, 
        color: 'text-red-600 bg-red-50 hover:bg-red-100',
        activeColor: 'text-white bg-red-600 hover:bg-red-700 ring-2 ring-red-600 ring-offset-2'
      },
      late: { 
        label: 'สาย', 
        icon: ClockIconOutline, 
        color: 'text-orange-600 bg-orange-50 hover:bg-orange-100',
        activeColor: 'text-white bg-orange-600 hover:bg-orange-700 ring-2 ring-orange-600 ring-offset-2'
      },
      sick: { 
        label: 'ป่วย', 
        icon: AlertTriangle, 
        color: 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100',
        activeColor: 'text-white bg-yellow-600 hover:bg-yellow-700 ring-2 ring-yellow-600 ring-offset-2'
      },
      leave: { 
        label: 'ลา', 
        icon: AlertCircle, 
        color: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
        activeColor: 'text-white bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-600 ring-offset-2'
      },
    };
    
    return configs[status as keyof typeof configs];
  };

  if (loading) return <PageLoading />;
  if (!classData || !schedule) return null;

  const stats = getAttendanceStats();

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push(`/attendance/${classId}`)}
          className="mb-4"
        >
          ← กลับ
        </Button>
        
        <h1 className="text-3xl font-bold tracking-tight">เช็คชื่อ - {classData.name}</h1>
        <div className="flex items-center gap-4 text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>ครั้งที่ {schedule.sessionNumber}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDateWithDay(schedule.sessionDate)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{formatTime(classData.startTime)} - {formatTime(classData.endTime)}</span>
          </div>
        </div>
      </div>

      {/* Teacher Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ครูผู้สอน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>ครูที่สอนจริง</Label>
              <Select value={actualTeacherId} onValueChange={(value) => {
                setActualTeacherId(value);
                setHasChanges(true);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกครู" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        <span>{teacher.nickname || teacher.name}</span>
                        {teacher.id === classData.teacherId && (
                          <Badge variant="secondary" className="ml-2 text-xs">ครูประจำ</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {actualTeacherId !== classData.teacherId && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  กำลังบันทึกว่า {teachers.find(t => t.id === actualTeacherId)?.name} สอนแทนในคาบนี้
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllPresent}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              มาทั้งหมด
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyFromPrevious}
              disabled
            >
              <Copy className="h-4 w-4 mr-2" />
              คัดลอกจากครั้งก่อน
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">รายชื่อนักเรียน ({attendance.length} คน)</CardTitle>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-600">เช็คแล้ว: {stats.checked}/{stats.total}</span>
              <span className="text-green-600">มา: {stats.present}</span>
              <span className="text-red-600">ขาด: {stats.absent + stats.sick + stats.leave}</span>
              <span className="text-orange-600">สาย: {stats.late}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attendance.map((student, index) => {
              return (
                <div key={student.studentId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-lg">
                          {index + 1}. {student.studentNickname || student.studentName}
                        </span>
                        {student.studentNickname && (
                          <span className="text-sm text-muted-foreground">
                            ({student.studentName})
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        ผู้ปกครอง: {student.parentName}
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      {(['present', 'absent', 'late', 'sick', 'leave'] as const).map((status) => {
                        const config = getStatusButton(status);
                        const Icon = config.icon;
                        const isSelected = student.status === status;
                        
                        return (
                          <Button
                            key={status}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAttendanceChange(student.studentId, status)}
                            className={cn(
                              "transition-all duration-200",
                              isSelected ? config.activeColor : config.color
                            )}
                          >
                            <Icon className="h-4 w-4 mr-1" />
                            {config.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {student.status !== 'present' && student.status !== '' && (
                    <div className="mt-3">
                      <Textarea
                        placeholder="หมายเหตุ..."
                        value={student.note}
                        onChange={(e) => handleNoteChange(student.studentId, e.target.value)}
                        className="h-20"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Global Note */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">บันทึกประจำคาบ</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="บันทึกเพิ่มเติม..."
            value={globalNote}
            onChange={(e) => {
              setGlobalNote(e.target.value);
              setHasChanges(true);
            }}
            className="h-24"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2 sticky bottom-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/attendance/${classId}`)}
          disabled={saving}
        >
          ยกเลิก
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <>กำลังบันทึก...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              บันทึกการเช็คชื่อ
            </>
          )}
        </Button>
      </div>
    </div>
  );
}