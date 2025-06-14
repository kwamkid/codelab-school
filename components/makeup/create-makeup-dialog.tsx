'use client';

import { useState, useEffect } from 'react';
import { Student, Class, ClassSchedule, Teacher, Room, Enrollment } from '@/types/models';
import { createMakeupRequest, scheduleMakeupClass, getMakeupRequestsBySchedules } from '@/lib/services/makeup';
import { getClassSchedules } from '@/lib/services/classes';
import { getEnrollmentsByStudent } from '@/lib/services/enrollments';
import { getActiveTeachers } from '@/lib/services/teachers';
import { getActiveRoomsByBranch } from '@/lib/services/rooms';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Save, X, User, AlertCircle, CalendarPlus, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth } from '@/lib/firebase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import StudentSearchSelect from '@/components/ui/student-search-select';
import { Badge } from "@/components/ui/badge";

interface CreateMakeupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: Class[];
  students: (Student & { parentName: string; parentPhone: string })[];
  onCreated: () => void;
}

export default function CreateMakeupDialog({
  open,
  onOpenChange,
  classes,
  students,
  onCreated
}: CreateMakeupDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [enrolledClasses, setEnrolledClasses] = useState<{enrollment: Enrollment; class: Class}[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [scheduleNow, setScheduleNow] = useState(false);
  const [existingMakeups, setExistingMakeups] = useState<Record<string, any>>({});
  
  const [formData, setFormData] = useState({
    studentId: '',
    classId: '',
    scheduleId: '',
    type: 'scheduled' as 'scheduled' | 'ad-hoc',
    reason: '',
    // Makeup schedule fields
    makeupDate: '',
    makeupStartTime: '',
    makeupEndTime: '',
    makeupTeacherId: '',
    makeupRoomId: ''
  });

  // Active students only
  const activeStudents = students.filter(s => s.isActive);

  // When student is selected, load their enrolled classes
  useEffect(() => {
    if (formData.studentId) {
      loadStudentEnrollments();
    } else {
      setEnrolledClasses([]);
      setFormData(prev => ({ ...prev, classId: '', scheduleId: '' }));
    }
  }, [formData.studentId]);

  // When class is selected, load schedules
  useEffect(() => {
    if (formData.classId) {
      loadClassSchedules();
      // Set default teacher and times from selected class
      const selectedClass = enrolledClasses.find(ec => ec.class.id === formData.classId)?.class;
      if (selectedClass) {
        setFormData(prev => ({
          ...prev,
          makeupStartTime: selectedClass.startTime,
          makeupEndTime: selectedClass.endTime,
          makeupTeacherId: selectedClass.teacherId
        }));
        // Load teachers and rooms for the branch
        loadBranchData(selectedClass.branchId);
      }
    } else {
      setSchedules([]);
      setFormData(prev => ({ ...prev, scheduleId: '' }));
    }
  }, [formData.classId]);

  const loadStudentEnrollments = async () => {
    if (!formData.studentId) return;
    
    setLoadingEnrollments(true);
    try {
      const enrollments = await getEnrollmentsByStudent(formData.studentId);
      // Filter active enrollments only
      const activeEnrollments = enrollments.filter(e => e.status === 'active');
      
      // Get class details for each enrollment
      const enrollmentWithClasses = await Promise.all(
        activeEnrollments.map(async (enrollment) => {
          const cls = classes.find(c => c.id === enrollment.classId);
          if (cls && ['published', 'started'].includes(cls.status)) {
            return { enrollment, class: cls };
          }
          return null;
        })
      );
      
      setEnrolledClasses(enrollmentWithClasses.filter(Boolean) as {enrollment: Enrollment; class: Class}[]);
    } catch (error) {
      console.error('Error loading enrollments:', error);
      toast.error('ไม่สามารถโหลดข้อมูลคลาสของนักเรียนได้');
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const loadClassSchedules = async () => {
    if (!formData.classId || !formData.studentId) return;
    
    setLoadingSchedules(true);
    try {
      const schedulesData = await getClassSchedules(formData.classId);
      // Filter future or today schedules
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const availableSchedules = schedulesData.filter(s => {
        const scheduleDate = new Date(s.sessionDate);
        scheduleDate.setHours(0, 0, 0, 0);
        return scheduleDate >= today && s.status === 'scheduled';
      });
      
      setSchedules(availableSchedules);
      
      // Load existing makeup requests for these schedules
      const scheduleIds = availableSchedules.map(s => s.id);
      const makeupRequests = await getMakeupRequestsBySchedules(
        formData.studentId,
        formData.classId,
        scheduleIds
      );
      setExistingMakeups(makeupRequests);
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast.error('ไม่สามารถโหลดตารางเรียนได้');
    } finally {
      setLoadingSchedules(false);
    }
  };

  const loadBranchData = async (branchId: string) => {
    try {
      const [teachersData, roomsData] = await Promise.all([
        getActiveTeachers(),
        getActiveRoomsByBranch(branchId)
      ]);
      
      // Filter teachers who can teach at this branch
      const branchTeachers = teachersData.filter(t => 
        t.availableBranches.includes(branchId)
      );
      
      setTeachers(branchTeachers);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading branch data:', error);
    }
  };

  const handleSubmit = async () => {
    // Validate
    if (!formData.studentId || !formData.classId || !formData.scheduleId || !formData.reason.trim()) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    // Check if already has makeup for this schedule
    if (existingMakeups[formData.scheduleId]) {
      toast.error('มีการขอ Makeup สำหรับวันนี้แล้ว');
      return;
    }

    // If schedule now, validate makeup fields
    if (scheduleNow) {
      if (!formData.makeupDate || !formData.makeupTeacherId || !formData.makeupRoomId) {
        toast.error('กรุณากรอกข้อมูลการนัด Makeup ให้ครบถ้วน');
        return;
      }
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error('กรุณาเข้าสู่ระบบ');
      return;
    }

    // Get selected student
    const selectedStudent = students.find(s => s.id === formData.studentId);
    if (!selectedStudent) {
      toast.error('ไม่พบข้อมูลนักเรียน');
      return;
    }

    setLoading(true);
    try {
      // Create makeup request
      const makeupId = await createMakeupRequest({
        type: formData.type,
        originalClassId: formData.classId,
        originalScheduleId: formData.scheduleId,
        studentId: formData.studentId,
        parentId: selectedStudent.parentId,
        requestDate: new Date(),
        requestedBy: currentUser.uid,
        reason: formData.reason,
        status: 'pending'
      });

      // If schedule now is checked, schedule the makeup
      if (scheduleNow && makeupId) {
        const selectedClass = enrolledClasses.find(ec => ec.class.id === formData.classId)?.class;
        
        await scheduleMakeupClass(makeupId, {
          date: new Date(formData.makeupDate),
          startTime: formData.makeupStartTime,
          endTime: formData.makeupEndTime,
          teacherId: formData.makeupTeacherId,
          branchId: selectedClass?.branchId || '',
          roomId: formData.makeupRoomId,
          confirmedBy: currentUser.uid
        });
        
        toast.success('สร้างและนัด Makeup Class เรียบร้อยแล้ว');
      } else {
        toast.success('สร้าง Makeup Request เรียบร้อยแล้ว');
      }

      onCreated();
      
      // Reset form
      setFormData({
        studentId: '',
        classId: '',
        scheduleId: '',
        type: 'scheduled',
        reason: '',
        makeupDate: '',
        makeupStartTime: '',
        makeupEndTime: '',
        makeupTeacherId: '',
        makeupRoomId: ''
      });
      setScheduleNow(false);
      setExistingMakeups({});
    } catch (error: any) {
      console.error('Error creating makeup request:', error);
      if (error.message === 'Makeup request already exists for this schedule') {
        toast.error('มีการขอ Makeup สำหรับวันนี้แล้ว');
      } else {
        toast.error('ไม่สามารถสร้าง Makeup Request ได้');
      }
    } finally {
      setLoading(false);
    }
  };

  const getScheduleInfo = (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return '';
    return `ครั้งที่ ${schedule.sessionNumber} - ${formatDate(schedule.sessionDate, 'long')}`;
  };

  const getMakeupStatusBadge = (makeup: any) => {
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'scheduled': 'bg-blue-100 text-blue-700',
      'completed': 'bg-green-100 text-green-700',
    };

    const statusLabels = {
      'pending': 'รอจัดตาราง',
      'scheduled': 'นัดแล้ว',
      'completed': 'เรียนแล้ว',
    };

    const statusIcons = {
      'pending': Clock,
      'scheduled': CalendarPlus,
      'completed': CheckCircle,
    };

    const Icon = statusIcons[makeup.status as keyof typeof statusIcons];

    return (
      <Badge className={statusColors[makeup.status as keyof typeof statusColors]}>
        <Icon className="h-3 w-3 mr-1" />
        {statusLabels[makeup.status as keyof typeof statusLabels]}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>สร้าง Makeup Request</DialogTitle>
          <DialogDescription>
            บันทึกการขอเรียนชดเชยสำหรับนักเรียนที่จะขาดเรียน
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">ข้อมูลการขาด</TabsTrigger>
            <TabsTrigger value="schedule" disabled={!scheduleNow}>นัด Makeup</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            {/* Student Selection with Search */}
            <StudentSearchSelect
              students={activeStudents}
              value={formData.studentId}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                studentId: value,
                classId: '', // Reset class
                scheduleId: '' // Reset schedule
              }))}
              label="นักเรียน"
              required
              placeholder="ค้นหาด้วยชื่อนักเรียน, ชื่อผู้ปกครอง, LINE, เบอร์โทร..."
            />

            {/* Class Selection - Show enrolled classes */}
            <div className="space-y-2">
              <Label>คลาสที่ลงทะเบียน *</Label>
              <Select
                value={formData.classId}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  classId: value,
                  scheduleId: '' // Reset schedule
                }))}
                disabled={!formData.studentId || loadingEnrollments}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !formData.studentId ? "เลือกนักเรียนก่อน" :
                    loadingEnrollments ? "กำลังโหลด..." :
                    "เลือกคลาส"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {enrolledClasses.length === 0 ? (
                    <div className="p-2 text-center text-sm text-gray-500">
                      {!formData.studentId ? "กรุณาเลือกนักเรียนก่อน" : "นักเรียนยังไม่ได้ลงทะเบียนคลาสใด"}
                    </div>
                  ) : (
                    enrolledClasses.map(({ enrollment, class: cls }) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        <div>
                          <p className="font-medium">{cls.name}</p>
                          <p className="text-xs text-gray-500">{cls.code}</p>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Schedule Selection with Makeup Status */}
            <div className="space-y-2">
              <Label>วันที่จะขาด *</Label>
              <Select
                value={formData.scheduleId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, scheduleId: value }))}
                disabled={!formData.classId || loadingSchedules}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !formData.classId ? "เลือกคลาสก่อน" :
                    loadingSchedules ? "กำลังโหลด..." :
                    "เลือกวันที่"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {schedules.length === 0 ? (
                    <div className="p-2 text-center text-sm text-gray-500">
                      ไม่มีตารางเรียนที่สามารถขอ Makeup ได้
                    </div>
                  ) : (
                    schedules.map(schedule => {
                      const existingMakeup = existingMakeups[schedule.id];
                      const isDisabled = !!existingMakeup;
                      
                      return (
                        <SelectItem 
                          key={schedule.id} 
                          value={schedule.id}
                          disabled={isDisabled}
                        >
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className={isDisabled ? 'text-gray-400' : ''}>
                              {getScheduleInfo(schedule.id)}
                            </span>
                            {existingMakeup && getMakeupStatusBadge(existingMakeup)}
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              {formData.scheduleId && existingMakeups[formData.scheduleId] && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-800">
                    มีการขอ Makeup สำหรับวันนี้แล้ว
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Request Type */}
            <div className="space-y-2">
              <Label>ประเภทการขอ</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'scheduled' | 'ad-hoc') => 
                  setFormData(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">ขอล่วงหน้า (แจ้งก่อนวันเรียน)</SelectItem>
                  <SelectItem value="ad-hoc">ขอหลังขาด (แจ้งหลังขาดเรียน)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">เหตุผลที่ขาด *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="เช่น ป่วย, ติดธุระสำคัญ, เดินทางต่างจังหวัด"
                rows={3}
                required
              />
            </div>

            {/* Schedule Now Option */}
            <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
              <Switch
                id="schedule-now"
                checked={scheduleNow}
                onCheckedChange={setScheduleNow}
              />
              <Label htmlFor="schedule-now" className="flex items-center gap-2 cursor-pointer">
                <CalendarPlus className="h-4 w-4 text-blue-600" />
                นัดวัน Makeup เลย
              </Label>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            {scheduleNow && formData.classId && (
              <>
                {/* Makeup Date */}
                <div className="space-y-2">
                  <Label htmlFor="makeup-date">วันที่นัด Makeup *</Label>
                  <Input
                    id="makeup-date"
                    type="date"
                    value={formData.makeupDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, makeupDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="makeup-start-time">เวลาเริ่ม *</Label>
                    <Input
                      id="makeup-start-time"
                      type="time"
                      value={formData.makeupStartTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, makeupStartTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="makeup-end-time">เวลาจบ *</Label>
                    <Input
                      id="makeup-end-time"
                      type="time"
                      value={formData.makeupEndTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, makeupEndTime: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Teacher */}
                <div className="space-y-2">
                  <Label>ครูผู้สอน *</Label>
                  <Select
                    value={formData.makeupTeacherId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, makeupTeacherId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกครู" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.nickname || teacher.name}
                          {teacher.id === enrolledClasses.find(ec => ec.class.id === formData.classId)?.class.teacherId && 
                            ' (ครูประจำคลาส)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Room */}
                <div className="space-y-2">
                  <Label>ห้องเรียน *</Label>
                  <Select
                    value={formData.makeupRoomId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, makeupRoomId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกห้อง" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map(room => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} (จุ {room.capacity} คน)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Info Alert */}
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {!scheduleNow ? (
              <>หลังจากสร้าง Request แล้ว สามารถจัดตารางได้ที่หน้า "Makeup Class"</>
            ) : (
              <>ระบบจะสร้าง Request และนัดวัน Makeup ให้ในขั้นตอนเดียว</>
            )}
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading || 
              !formData.studentId || 
              !formData.classId || 
              !formData.scheduleId || 
              !formData.reason.trim() ||
              (formData.scheduleId && !!existingMakeups[formData.scheduleId]) ||
              (scheduleNow && (!formData.makeupDate || !formData.makeupTeacherId || !formData.makeupRoomId))
            }
            className="bg-red-500 hover:bg-red-600"
          >
            {loading ? (
              <>กำลังบันทึก...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {scheduleNow ? 'สร้างและนัด' : 'สร้าง Request'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}