'use client';

import { useState, useEffect } from 'react';
import { MakeupClass, Student, Class, Teacher, Room, ClassSchedule } from '@/types/models';
import { scheduleMakeupClass, checkTeacherAvailability } from '@/lib/services/makeup';
import { getActiveTeachers } from '@/lib/services/teachers';
import { getActiveRoomsByBranch } from '@/lib/services/rooms';
import { getClassSchedule } from '@/lib/services/classes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User, MapPin, Save, X, AlertCircle } from 'lucide-react';
import { formatDate, getDayName } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { auth } from '@/lib/firebase/client';

interface ScheduleMakeupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  makeup: MakeupClass;
  student: Student & { parentName: string; parentPhone: string };
  classInfo: Class;
  onScheduled: () => void;
}

export default function ScheduleMakeupDialog({
  open,
  onOpenChange,
  makeup,
  student,
  classInfo,
  onScheduled
}: ScheduleMakeupDialogProps) {
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [originalSchedule, setOriginalSchedule] = useState<ClassSchedule | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  
  const [formData, setFormData] = useState({
    date: '',
    startTime: classInfo.startTime || '10:00',
    endTime: classInfo.endTime || '12:00',
    teacherId: classInfo.teacherId || '',
    roomId: classInfo.roomId || '',
  });
  
  const [availability, setAvailability] = useState<{
    teacher: boolean | null;
    room: boolean | null;
  }>({ teacher: null, room: null });

  useEffect(() => {
    if (open) {
      loadData();
      loadOriginalSchedule();
    }
  }, [open, classInfo.branchId, makeup.originalScheduleId]);

  useEffect(() => {
    // Check availability when form data changes
    if (formData.date && formData.teacherId && formData.roomId) {
      checkAvailability();
    }
  }, [formData]);

  const loadOriginalSchedule = async () => {
    if (!makeup.originalScheduleId || !makeup.originalClassId) return;
    
    setLoadingSchedule(true);
    try {
      const schedule = await getClassSchedule(makeup.originalClassId, makeup.originalScheduleId);
      setOriginalSchedule(schedule);
    } catch (error) {
      console.error('Error loading original schedule:', error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const loadData = async () => {
    try {
      const [teachersData, roomsData] = await Promise.all([
        getActiveTeachers(),
        getActiveRoomsByBranch(classInfo.branchId)
      ]);
      
      // Filter teachers who can teach at this branch
      const branchTeachers = teachersData.filter(t => 
        t.availableBranches.includes(classInfo.branchId)
      );
      
      setTeachers(branchTeachers);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    }
  };

  const checkAvailability = async () => {
    if (!formData.date || !formData.teacherId) return;
    
    setCheckingAvailability(true);
    try {
      const date = new Date(formData.date);
      const teacherAvailable = await checkTeacherAvailability(
        formData.teacherId,
        date,
        formData.startTime,
        formData.endTime
      );
      
      setAvailability(prev => ({ ...prev, teacher: teacherAvailable }));
      
      // TODO: Check room availability
      setAvailability(prev => ({ ...prev, room: true }));
    } catch (error) {
      console.error('Error checking availability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async () => {
    // Validate
    if (!formData.date || !formData.teacherId || !formData.roomId) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    
    if (availability.teacher === false) {
      toast.error('ครูไม่ว่างในช่วงเวลานี้');
      return;
    }
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error('กรุณาเข้าสู่ระบบ');
      return;
    }
    
    setLoading(true);
    try {
      await scheduleMakeupClass(makeup.id, {
        date: new Date(formData.date),
        startTime: formData.startTime,
        endTime: formData.endTime,
        teacherId: formData.teacherId,
        branchId: classInfo.branchId,
        roomId: formData.roomId,
        confirmedBy: currentUser.uid
      });
      
      onScheduled();
    } catch (error) {
      console.error('Error scheduling makeup:', error);
      toast.error('ไม่สามารถจัดตารางได้');
    } finally {
      setLoading(false);
    }
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher?.nickname || teacher?.name || 'Unknown';
  };

  const getRoomName = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    return room?.name || 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>จัดตาราง Makeup Class</DialogTitle>
          <DialogDescription>
            จัดตารางเรียนชดเชยสำหรับ {student.nickname}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student & Class Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">นักเรียน:</span>
              <span>{student.name} ({student.nickname})</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="font-medium">คลาสเดิม:</span>
              <span>{classInfo.name}</span>
              {originalSchedule && (
                <>
                  <span className="text-red-600 font-medium">
                    ครั้งที่ {originalSchedule.sessionNumber}
                  </span>
                  <span className="text-gray-600">
                    ({formatDate(originalSchedule.sessionDate, 'long')})
                  </span>
                </>
              )}
            </div>
            <div className="text-sm">
              <span className="font-medium">เหตุผล:</span> {makeup.reason}
            </div>
            {originalSchedule && (
              <div className="pt-2 border-t border-gray-200">
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm">
                    ขาดเรียนวัน {getDayName(new Date(originalSchedule.sessionDate).getDay())}, 
                    {' '}{formatDate(originalSchedule.sessionDate, 'long')} 
                    {' '}เวลา {classInfo.startTime} - {classInfo.endTime} น.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          {/* Schedule Form */}
          <div className="space-y-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">วันที่นัด *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">เวลาเริ่ม *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">เวลาจบ *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>

            {/* Teacher and Room on same row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teacher">ครูผู้สอน *</Label>
                <Select
                  value={formData.teacherId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, teacherId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกครู" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={classInfo.teacherId}>
                      {getTeacherName(classInfo.teacherId)} (ครูประจำคลาส)
                    </SelectItem>
                    {teachers
                      .filter(t => t.id !== classInfo.teacherId)
                      .map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.nickname || teacher.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {availability.teacher === false && (
                  <p className="text-xs text-red-600">ครูไม่ว่างในช่วงเวลานี้</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="room">ห้องเรียน *</Label>
                <Select
                  value={formData.roomId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, roomId: value }))}
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
            </div>
          </div>

          {/* Availability Status */}
          {(availability.teacher !== null || availability.room !== null) && (
            <Alert className={availability.teacher === false ? 'border-red-200' : 'border-green-200'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {availability.teacher === false ? (
                  'ครูไม่ว่างในช่วงเวลานี้ กรุณาเลือกเวลาอื่นหรือเปลี่ยนครู'
                ) : checkingAvailability ? (
                  'กำลังตรวจสอบ...'
                ) : (
                  'ครูและห้องเรียนว่าง'
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

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
            disabled={loading || !formData.date || !formData.teacherId || !formData.roomId || availability.teacher === false}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {loading ? (
              <>กำลังบันทึก...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                จัดตาราง
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}