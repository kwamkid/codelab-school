'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Calendar as CalendarIcon, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MakeupClass, Teacher, Branch, Room } from '@/types/models';
import { scheduleMakeupClass } from '@/lib/services/makeup';
import { getTeachers } from '@/lib/services/teachers';
import { getBranches } from '@/lib/services/branches';
import { getRoomsByBranch } from '@/lib/services/rooms';
import { checkAvailability, AvailabilityIssue } from '@/lib/utils/availability';
import { useAuth } from '@/hooks/useAuth';

const formSchema = z.object({
  date: z.date({
    required_error: 'กรุณาเลือกวันที่',
  }),
  startTime: z.string().min(1, 'กรุณาระบุเวลาเริ่ม'),
  endTime: z.string().min(1, 'กรุณาระบุเวลาสิ้นสุด'),
  teacherId: z.string().min(1, 'กรุณาเลือกครู'),
  branchId: z.string().min(1, 'กรุณาเลือกสาขา'),
  roomId: z.string().min(1, 'กรุณาเลือกห้อง'),
});

type FormData = z.infer<typeof formSchema>;

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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: undefined,
      startTime: '',
      endTime: '',
      teacherId: '',
      branchId: '',
      roomId: '',
    },
  });

  const selectedBranchId = form.watch('branchId');
  const selectedDate = form.watch('date');
  const selectedStartTime = form.watch('startTime');
  const selectedEndTime = form.watch('endTime');
  const selectedRoomId = form.watch('roomId');
  const selectedTeacherId = form.watch('teacherId');

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
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      }
    };

    loadData();
  }, [open]);

  // Load rooms when branch changes
  useEffect(() => {
    const loadRooms = async () => {
      if (!selectedBranchId) {
        setRooms([]);
        return;
      }

      try {
        const roomsData = await getRoomsByBranch(selectedBranchId);
        setRooms(roomsData.filter(r => r.isActive));
        
        // Reset room selection if not in new branch
        if (!roomsData.some(r => r.id === form.getValues('roomId'))) {
          form.setValue('roomId', '');
        }
      } catch (error) {
        console.error('Error loading rooms:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลห้อง');
      }
    };

    loadRooms();
  }, [selectedBranchId, form]);

  // Check availability when relevant fields change
  useEffect(() => {
    const checkScheduleAvailability = async () => {
      if (!selectedDate || !selectedStartTime || !selectedEndTime || 
          !selectedBranchId || !selectedRoomId || !selectedTeacherId) {
        setAvailabilityIssues([]);
        return;
      }

      setCheckingAvailability(true);
      try {
        const result = await checkAvailability({
          date: selectedDate,
          startTime: selectedStartTime,
          endTime: selectedEndTime,
          branchId: selectedBranchId,
          roomId: selectedRoomId,
          teacherId: selectedTeacherId,
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
  }, [selectedDate, selectedStartTime, selectedEndTime, selectedBranchId, 
      selectedRoomId, selectedTeacherId, makeupRequest.id]);

  const handleSubmit = async (data: FormData) => {
    if (availabilityIssues.length > 0) {
      toast.error('ไม่สามารถจัด Makeup Class ได้ เนื่องจากมีปัญหาความพร้อมใช้งาน');
      return;
    }

    setLoading(true);
    try {
      await scheduleMakeupClass(makeupRequest.id, {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        teacherId: data.teacherId,
        branchId: data.branchId,
        roomId: data.roomId,
        confirmedBy: user?.uid || 'admin',
      });

      toast.success('จัดตาราง Makeup Class เรียบร้อยแล้ว');
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Error scheduling makeup:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการจัดตาราง');
    } finally {
      setLoading(false);
    }
  };

  // Generate time options
  const timeOptions = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  // Get issue icon based on type
  const getIssueIcon = (type: AvailabilityIssue['type']) => {
    switch (type) {
      case 'holiday':
        return <CalendarIcon className="h-3 w-3 text-red-500" />;
      case 'room_conflict':
        return <XCircle className="h-3 w-3 text-orange-500" />;
      case 'teacher_conflict':
        return <AlertCircle className="h-3 w-3 text-yellow-600" />;
      default:
        return <XCircle className="h-3 w-3 text-red-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>จัดตาราง Makeup Class</DialogTitle>
          <DialogDescription>
            กำหนดวันเวลาและสถานที่สำหรับ Makeup Class
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Student & Class Info */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">นักเรียน:</span>
                <span className="font-medium">
                  {makeupRequest.studentNickname || makeupRequest.studentName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">คลาสเดิม:</span>
                <span className="font-medium">
                  {makeupRequest.subjectName} - {makeupRequest.className}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">เหตุผล:</span>
                <span className="font-medium">{makeupRequest.reason}</span>
              </div>
            </div>

            {/* Availability Issues Alert */}
            {availabilityIssues.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">ไม่สามารถจัดเวลานี้ได้:</p>
                    {availabilityIssues.map((issue, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        {getIssueIcon(issue.type)}
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Available Alert */}
            {selectedDate && selectedStartTime && selectedEndTime && 
             selectedBranchId && selectedRoomId && selectedTeacherId && 
             availabilityIssues.length === 0 && !checkingAvailability && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  เวลานี้สามารถจัด Makeup Class ได้
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Branch */}
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>สาขา</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกสาขา" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Room */}
              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ห้อง</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={!selectedBranchId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedBranchId ? "เลือกห้อง" : "เลือกสาขาก่อน"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name} (จุ {room.capacity} คน)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วันที่</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: th })
                            ) : (
                              <span>เลือกวันที่</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      เลือกวันที่สำหรับ Makeup Class
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Teacher */}
              <FormField
                control={form.control}
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ครูผู้สอน</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกครู" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.nickname || teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      สามารถเลือกครูคนอื่นที่ไม่ใช่ครูประจำคลาสได้
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Time */}
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เวลาเริ่ม</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกเวลาเริ่ม" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Time */}
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เวลาสิ้นสุด</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={!form.watch('startTime')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกเวลาสิ้นสุด" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeOptions
                          .filter(time => time > (form.watch('startTime') || ''))
                          .map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
                disabled={loading}
              >
                ยกเลิก
              </Button>
              <Button 
                type="submit" 
                disabled={loading || checkingAvailability || availabilityIssues.length > 0}
              >
                {loading ? 'กำลังบันทึก...' : 'จัดตาราง'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}