'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Clock, 
  MapPin, 
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  UserCheck,
  School,
  Phone,
  User
} from 'lucide-react';
import { getEnrollmentsByClass } from '@/lib/services/enrollments';
import { getStudent, getParent } from '@/lib/services/parents';
import { getTeacher, getActiveTeachers } from '@/lib/services/teachers';
import { updateClassSchedule } from '@/lib/services/classes';
import { Enrollment, Student, Parent, Teacher } from '@/types/models';
import { formatDate, calculateAge } from '@/lib/utils';
import { toast } from 'sonner';
import { CalendarEvent } from '@/lib/services/dashboard';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
  scheduleId?: string;
  onAttendanceSaved?: () => void;
}

interface StudentWithParent extends Student {
  parentName: string;
  parentPhone: string;
  enrollment: Enrollment;
  attendanceHistory?: {
    present: number;
    absent: number;
    late: number;
    absentSessions: Array<{
      sessionNumber: number;
      sessionDate: Date;
      makeupDate?: Date;
      makeupStatus?: 'pending' | 'scheduled' | 'completed';
    }>;
  };
}

export default function ClassDetailDialog({
  open,
  onOpenChange,
  event,
  scheduleId,
  onAttendanceSaved
}: ClassDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentWithParent[]>([]);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [actualTeacherId, setActualTeacherId] = useState<string>('');
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    console.log('Dialog state:', { open, event });
    if (open && event) {
      loadData();
      setActiveTab('info'); // Reset to info tab when dialog opens
    }
  }, [open, event]);

  const loadData = async () => {
    if (!event) return;
    
    console.log('Loading data for class:', event.classId);
    setLoading(true);
    try {
      // Load enrollments and students
      console.log('Getting enrollments...');
      const enrollments = await getEnrollmentsByClass(event.classId);
      console.log('Found enrollments:', enrollments.length);
      
      const studentsData: StudentWithParent[] = [];
      
      for (const enrollment of enrollments) {
        console.log('Loading student and parent:', enrollment.studentId, enrollment.parentId);
        const [student, parent] = await Promise.all([
          getStudent(enrollment.parentId, enrollment.studentId),
          getParent(enrollment.parentId)
        ]);
        
        if (student && parent) {
          // Load attendance history for this student
          const attendanceHistory = await getStudentAttendanceHistory(
            event.classId, 
            enrollment.studentId
          );
          
          studentsData.push({
            ...student,
            parentName: parent.displayName,
            parentPhone: parent.phone,
            enrollment,
            attendanceHistory
          });
        }
      }
      
      console.log('Loaded students:', studentsData.length);
      setStudents(studentsData.sort((a, b) => a.name.localeCompare(b.name)));
      
      // Initialize attendance (all present by default)
      const initialAttendance: Record<string, 'present' | 'absent' | 'late'> = {};
      studentsData.forEach(student => {
        initialAttendance[student.id] = 'present';
      });
      setAttendance(initialAttendance);
      
      // Load available teachers for substitute
      console.log('Loading teachers...');
      const teachers = await getActiveTeachers();
      setAvailableTeachers(teachers);
      console.log('Loaded teachers:', teachers.length);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to get attendance history
  const getStudentAttendanceHistory = async (classId: string, studentId: string) => {
    try {
      // This would query all previous schedules and their attendance records
      // For now, returning mock data
      return {
        present: 0,
        absent: 0,
        late: 0,
        absentSessions: []
      };
    } catch (error) {
      console.error('Error loading attendance history:', error);
      return {
        present: 0,
        absent: 0,
        late: 0,
        absentSessions: []
      };
    }
  };

  const handleSaveAttendance = async () => {
    if (!event || !scheduleId) return;
    
    setSaving(true);
    try {
      // Prepare attendance data
      const attendanceData = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status,
        note: status === 'absent' ? 'ขาดเรียน' : status === 'late' ? 'มาสาย' : ''
      }));
      
      // Update schedule with attendance and actual teacher
      await updateClassSchedule(event.classId, scheduleId, {
        attendance: attendanceData,
        actualTeacherId: actualTeacherId || event.extendedProps.teacherName,
        status: 'completed'
      });
      
      toast.success('บันทึกการเช็คชื่อเรียบร้อยแล้ว');
      
      // Call the callback if provided
      if (onAttendanceSaved) {
        onAttendanceSaved();
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  if (!event) return null;

  const presentCount = Object.values(attendance).filter(status => status === 'present').length;
  const absentCount = Object.values(attendance).filter(status => status === 'absent').length;
  const lateCount = Object.values(attendance).filter(status => status === 'late').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: event.backgroundColor }}
            />
            {event.title}
          </DialogTitle>
          <DialogDescription>
            ครั้งที่ {event.extendedProps.sessionNumber} • {formatDate(event.start, 'long')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">ข้อมูลคลาส</TabsTrigger>
            <TabsTrigger value="attendance">เช็คชื่อ</TabsTrigger>
          </TabsList>
          
          {/* Class Info Tab */}
          <TabsContent value="info" className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Class Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{event.extendedProps.roomName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{event.extendedProps.branchName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>ครู{event.extendedProps.teacherName}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{students.length} / {event.extendedProps.maxStudents} คน</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{event.start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {event.end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                    </div>
                  </div>
                </div>

                {/* Students List */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <School className="h-4 w-4" />
                    รายชื่อนักเรียน ({students.length} คน)
                  </h4>
                  <div className="space-y-2">
                    {students.map((student, index) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500 w-8">{index + 1}.</span>
                          <div className="flex-1">
                            <p className="font-medium">{student.nickname} ({student.name})</p>
                            <p className="text-xs text-gray-500">อายุ {calculateAge(student.birthdate)} ปี</p>
                            {/* แสดงสถิติการเข้าเรียน */}
                            {student.attendanceHistory && (student.attendanceHistory.absent > 0 || student.attendanceHistory.present > 0) && (
                              <div className="flex items-center gap-3 mt-1 text-xs">
                                <span className="text-green-600">
                                  มา {student.attendanceHistory.present} ครั้ง
                                </span>
                                {student.attendanceHistory.absent > 0 && (
                                  <span className="text-red-600">
                                    ขาด {student.attendanceHistory.absent} ครั้ง
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            <p className="text-gray-600">{student.parentName}</p>
                            <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                              <Phone className="h-3 w-3" />
                              {student.parentPhone}
                            </p>
                          </div>
                          {/* ปุ่ม Makeup ถ้ามีการขาดเรียน */}
                          {student.attendanceHistory && student.attendanceHistory.absent > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 text-xs"
                              onClick={() => {
                                // TODO: Open makeup dialog
                                toast.info('ฟีเจอร์ Makeup Class กำลังพัฒนา');
                              }}
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              Makeup
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="flex-1 overflow-auto">
            <div className="space-y-4">
              {/* Teacher Selection */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Label className="text-sm font-medium mb-2 block">ครูผู้สอน</Label>
                <Select
                  value={actualTeacherId || event.extendedProps.teacherName}
                  onValueChange={setActualTeacherId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={event.extendedProps.teacherName}>
                      ครู{event.extendedProps.teacherName} (ครูประจำ)
                    </SelectItem>
                    {availableTeachers
                      .filter(t => t.nickname !== event.extendedProps.teacherName)
                      .map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          ครู{teacher.nickname || teacher.name} (ครูแทน)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Attendance Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                  <p className="text-xs text-green-700">มาเรียน</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-600">{absentCount}</p>
                  <p className="text-xs text-red-700">ขาดเรียน</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                  <Clock className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
                  <p className="text-xs text-yellow-700">มาสาย</p>
                </div>
              </div>

              {/* Students Attendance List */}
              <div className="space-y-2">
                {students.map((student, index) => (
                  <div key={student.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 w-8">{index + 1}.</span>
                        <div className="flex-1">
                          <p className="font-medium">{student.nickname}</p>
                          <p className="text-xs text-gray-500">{student.name}</p>
                          {/* แสดงประวัติการเข้าเรียน */}
                          {student.attendanceHistory && student.attendanceHistory.absent > 0 && (
                            <p className="text-xs text-red-600 mt-1">
                              ขาดเรียนไปแล้ว {student.attendanceHistory.absent} ครั้ง
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                          className={attendance[student.id] === 'present' ? 'bg-green-500 hover:bg-green-600' : ''}
                          onClick={() => setAttendance({ ...attendance, [student.id]: 'present' })}
                        >
                          <CheckCircle className="h-4 w-4" />
                          มา
                        </Button>
                        <Button
                          size="sm"
                          variant={attendance[student.id] === 'absent' ? 'default' : 'outline'}
                          className={attendance[student.id] === 'absent' ? 'bg-red-500 hover:bg-red-600' : ''}
                          onClick={() => setAttendance({ ...attendance, [student.id]: 'absent' })}
                        >
                          <XCircle className="h-4 w-4" />
                          ขาด
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  ยกเลิก
                </Button>
                <Button 
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      บันทึกการเช็คชื่อ
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}