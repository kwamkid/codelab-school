'use client';

import { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Clock,
  User,
  MapPin,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { MakeupClass, Teacher, Branch, Room, ClassSchedule } from '@/types/models';
import { scheduleMakeupClass } from '@/lib/services/makeup';
import { getTeachers } from '@/lib/services/teachers';
import { getBranches } from '@/lib/services/branches';
import { getRoomsByBranch } from '@/lib/services/rooms';
import { getClassSchedule } from '@/lib/services/classes';
import { checkAvailability, AvailabilityIssue } from '@/lib/utils/availability';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';

interface ScheduleMakeupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  makeupRequest: MakeupClass & {
    studentName?: string;
    studentNickname?: string;
    className?: string;
    subjectName?: string;
  };
  onSuccess?: () => void;
}

export default function ScheduleMakeupDialog({
  open,
  onOpenChange,
  makeupRequest,
  onSuccess,
}: ScheduleMakeupDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityIssues, setAvailabilityIssues] = useState<AvailabilityIssue[]>([]);
  const [originalSchedule, setOriginalSchedule] = useState<ClassSchedule | null>(null);
  const [branchName, setBranchName] = useState<string>('');
  
  // Form data - remove branchId since we'll use the original
  const [formData, setFormData] = useState({
    date: '',
    startTime: '10:00',
    endTime: '11:00',
    teacherId: '',
    branchId: '', // Will be set from class info
    roomId: '',
  });

  // Load initial data
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        const [teachersData, branchesData] = await Promise.all([
          getTeachers(),
          getBranches(),
        ]);

        setTeachers(teachersData.filter(t => t.isActive));
        setBranches(branchesData.filter(b => b.isActive));

        // Load original schedule data
        if (makeupRequest.originalClassId && makeupRequest.originalScheduleId) {
          const schedule = await getClassSchedule(
            makeupRequest.originalClassId, 
            makeupRequest.originalScheduleId
          );
          setOriginalSchedule(schedule);
        }

        // Get class info to set branch and default values
        const classesModule = await import('@/lib/services/classes');
        const classInfo = await classesModule.getClass(makeupRequest.originalClassId);
        if (classInfo) {
          const branch = branchesData.find(b => b.id === classInfo.branchId);
          setBranchName(branch?.name || '');
          
          setFormData(prev => ({ 
            ...prev, 
            branchId: classInfo.branchId,
            teacherId: classInfo.teacherId, // Default teacher
            startTime: classInfo.startTime,
            endTime: classInfo.endTime
          }));
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      }
    };

    loadData();
  }, [open, makeupRequest]);

  // Load rooms when we have branchId
  useEffect(() => {
    const loadRooms = async () => {
      if (!formData.branchId) {
        setRooms([]);
        return;
      }

      try {
        const roomsData = await getRoomsByBranch(formData.branchId);
        setRooms(roomsData.filter(r => r.isActive));
      } catch (error) {
        console.error('Error loading rooms:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลห้อง');
      }
    };

    loadRooms();
  }, [formData.branchId]);

  // Auto-set end time when start time changes
  useEffect(() => {
    if (formData.startTime) {
      const [hours, minutes] = formData.startTime.split(':').map(Number);
      const endHour = hours + 1; // Default 1 hour session
      const endMinutes = minutes.toString().padStart(2, '0');
      const newEndTime = `${endHour.toString().padStart(2, '0')}:${endMinutes}`;
      
      // Only update if it's a valid time
      if (endHour < 24) {
        setFormData(prev => ({ ...prev, endTime: newEndTime }));
      }
    }
  }, [formData.startTime]);

  // Check availability when relevant fields change
  useEffect(() => {
    const checkScheduleAvailability = async () => {
      if (!formData.date || !formData.startTime || !formData.endTime || 
          !formData.branchId || !formData.roomId || !formData.teacherId) {
        setAvailabilityIssues([]);
        return;
      }

      setCheckingAvailability(true);
      try {
        const result = await checkAvailability({
          date: new Date(formData.date),
          startTime: formData.startTime,
          endTime: formData.endTime,
          branchId: formData.branchId,
          roomId: formData.roomId,
          teacherId: formData.teacherId,
          excludeId: makeupRequest.id,
          excludeType: 'makeup'
        });

        setAvailabilityIssues(result.reasons);
      } catch (error) {
        console.error('Error checking availability:', error);
      } finally {
        setCheckingAvailability(false);
      }
    };

    const debounceTimer = setTimeout(checkScheduleAvailability, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData, makeupRequest.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!formData.date || !formData.startTime || !formData.endTime || 
        !formData.teacherId || !formData.roomId) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (availabilityIssues.length > 0) {
      toast.error('ไม่สามารถจัด Makeup Class ได้ เนื่องจากมีปัญหาความพร้อมใช้งาน');
      return;
    }

    setLoading(true);
    try {
      await scheduleMakeupClass(makeupRequest.id, {
        date: new Date(formData.date),
        startTime: formData.startTime,
        endTime: formData.endTime,
        teacherId: formData.teacherId,
        branchId: formData.branchId,
        roomId: formData.roomId,
        confirmedBy: user?.uid || 'admin',
      });

      toast.success('จัดตาราง Makeup Class เรียบร้อยแล้ว');
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        date: '',
        startTime: '10:00',
        endTime: '11:00',
        teacherId: '',
        branchId: '',
        roomId: '',
      });
    } catch (error: any) {
      console.error('Error scheduling makeup:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการจัดตาราง');
    } finally {
      setLoading(false);
    }
  };

  // Filter teachers based on branch
  const getAvailableTeachers = () => {
    return teachers.filter(teacher => 
      !formData.branchId || teacher.availableBranches.includes(formData.branchId)
    );
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      if (!newOpen) {
        // Reset form when closing
        setFormData({
          date: '',
          startTime: '10:00',
          endTime: '11:00',
          teacherId: '',
          branchId: '',
          roomId: '',
        });
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>จัดตาราง Makeup Class</DialogTitle>
          <DialogDescription>
            กำหนดวันเวลาและสถานที่สำหรับ Makeup Class
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student & Class Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">นักเรียน:</span>
              <span className="font-medium">
                {makeupRequest.studentNickname || makeupRequest.studentName}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">คลาสเดิม:</span>
              <div className="text-right">
                <span className="font-medium">
                  {makeupRequest.subjectName} - {makeupRequest.className}
                </span>
                {originalSchedule && (
                  <span className="text-sm text-gray-500 ml-2">
                    (ครั้งที่ {originalSchedule.sessionNumber})
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">เหตุผล:</span>
              <span className="font-medium">{makeupRequest.reason}</span>
            </div>
            {branchName && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">สาขา:</span>
                <span className="font-medium">{branchName}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Row 1: Date and Time Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">วันที่นัด Makeup *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              {/* Time Range */}
              <div className="space-y-2">
                <Label>ช่วงเวลา *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    step="300" // 5 minute intervals
                    required
                  />
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    step="300" // 5 minute intervals
                    min={formData.startTime}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Teacher and Room */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Teacher */}
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
                    {getAvailableTeachers().length === 0 ? (
                      <div className="p-2 text-sm text-gray-500 text-center">
                        ไม่มีครูที่สอนในสาขานี้
                      </div>
                    ) : (
                      getAvailableTeachers().map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.nickname || teacher.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  สามารถเลือกครูคนอื่นที่ไม่ใช่ครูประจำคลาสได้
                </p>
              </div>

              {/* Room */}
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
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} (จุ {room.capacity} คน)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Availability Status - Moved to bottom */}
          {checkingAvailability ? (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                กำลังตรวจสอบห้องว่าง...
              </AlertDescription>
            </Alert>
          ) : availabilityIssues.length > 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">ไม่สามารถจองเวลานี้ได้:</p>
                  {availabilityIssues.map((issue, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            formData.date && formData.startTime && formData.endTime && 
            formData.roomId && formData.teacherId && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  เวลานี้สามารถจองได้
                </AlertDescription>
              </Alert>
            )
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setFormData({
                  date: '',
                  startTime: '10:00',
                  endTime: '11:00',
                  teacherId: '',
                  branchId: '',
                  roomId: '',
                });
              }}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button 
              type="submit" 
              disabled={loading || checkingAvailability || availabilityIssues.length > 0}
              className="bg-red-500 hover:bg-red-600"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'จัดตาราง'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}