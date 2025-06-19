'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Calendar as CalendarIcon, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Teacher, Subject, Branch, Room } from '@/types/models';
import { getTeachers } from '@/lib/services/teachers';
import { getSubjects } from '@/lib/services/subjects';
import { getBranches } from '@/lib/services/branches';
import { getRoomsByBranch } from '@/lib/services/rooms';
import { checkTrialRoomAvailability } from '@/lib/services/trial-bookings';
import { toast } from 'sonner';

const formSchema = z.object({
  subjectId: z.string().min(1, 'กรุณาเลือกวิชา'),
  scheduledDate: z.date({
    required_error: 'กรุณาเลือกวันที่',
  }),
  startTime: z.string().min(1, 'กรุณาระบุเวลาเริ่ม'),
  endTime: z.string().min(1, 'กรุณาระบุเวลาสิ้นสุด'),
  teacherId: z.string().min(1, 'กรุณาเลือกครู'),
  branchId: z.string().min(1, 'กรุณาเลือกสาขา'),
  roomId: z.string().min(1, 'กรุณาเลือกห้อง'),
});

type FormData = z.infer<typeof formSchema>;

interface TrialSessionFormProps {
  bookingId: string;
  studentName: string;
  sessionData?: {
    id: string;
    subjectId: string;
    scheduledDate: Date;
    startTime: string;
    endTime: string;
    teacherId: string;
    branchId: string;
    roomId: string;
  };
  onSubmit: (data: FormData & { roomName?: string }) => Promise<void>;
  onCancel: () => void;
}

export default function TrialSessionForm({
  bookingId,
  studentName,
  sessionData,
  onSubmit,
  onCancel,
}: TrialSessionFormProps) {
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityIssues, setAvailabilityIssues] = useState<Array<{
    type: 'holiday' | 'room_conflict' | 'teacher_conflict';
    message: string;
  }>>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: sessionData ? {
      subjectId: sessionData.subjectId,
      scheduledDate: sessionData.scheduledDate,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      teacherId: sessionData.teacherId,
      branchId: sessionData.branchId,
      roomId: sessionData.roomId,
    } : {
      subjectId: '',
      scheduledDate: undefined,
      startTime: '',
      endTime: '',
      teacherId: '',
      branchId: '',
      roomId: '',
    },
  });

  const selectedBranchId = form.watch('branchId');
  const selectedDate = form.watch('scheduledDate');
  const selectedStartTime = form.watch('startTime');
  const selectedEndTime = form.watch('endTime');
  const selectedRoomId = form.watch('roomId');
  const selectedTeacherId = form.watch('teacherId');

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [teachersData, subjectsData, branchesData] = await Promise.all([
          getTeachers(),
          getSubjects(),
          getBranches(),
        ]);

        setTeachers(teachersData.filter(t => t.isActive));
        setSubjects(subjectsData.filter(s => s.isActive));
        setBranches(branchesData.filter(b => b.isActive));
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      }
    };

    loadData();
  }, []);

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
    const checkAvailability = async () => {
      if (!selectedDate || !selectedStartTime || !selectedEndTime || 
          !selectedBranchId || !selectedRoomId || !selectedTeacherId) {
        setAvailabilityIssues([]);
        return;
      }

      setCheckingAvailability(true);
      try {
        const result = await checkTrialRoomAvailability(
          selectedBranchId,
          selectedRoomId,
          selectedDate,
          selectedStartTime,
          selectedEndTime,
          selectedTeacherId,
          sessionData?.id
        );

        if (!result.available && result.conflicts) {
          setAvailabilityIssues(result.conflicts);
        } else {
          setAvailabilityIssues([]);
        }
      } catch (error) {
        console.error('Error checking availability:', error);
      } finally {
        setCheckingAvailability(false);
      }
    };

    const debounceTimer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(debounceTimer);
  }, [selectedDate, selectedStartTime, selectedEndTime, selectedBranchId, 
      selectedRoomId, selectedTeacherId, sessionData?.id]);

  const handleSubmit = async (data: FormData) => {
    if (availabilityIssues.length > 0) {
      toast.error('ไม่สามารถจองได้ เนื่องจากมีปัญหาความพร้อมใช้งาน');
      return;
    }

    setLoading(true);
    try {
      const selectedRoom = rooms.find(r => r.id === data.roomId);
      await onSubmit({
        ...data,
        roomName: selectedRoom?.name,
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">นักเรียน:</p>
          <p className="font-medium text-lg">{studentName}</p>
        </div>

        {/* Availability Issues Alert */}
        {availabilityIssues.length > 0 && (
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
        )}

        {/* Available Alert */}
        {selectedDate && selectedStartTime && selectedEndTime && 
         selectedBranchId && selectedRoomId && selectedTeacherId && 
         availabilityIssues.length === 0 && !checkingAvailability && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              เวลานี้สามารถจองได้
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Subject */}
          <FormField
            control={form.control}
            name="subjectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>วิชา</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกวิชา" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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

          {/* Date */}
          <FormField
            control={form.control}
            name="scheduledDate"
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

          {/* Teacher */}
          <FormField
            control={form.control}
            name="teacherId"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
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
            onClick={onCancel}
            disabled={loading}
          >
            ยกเลิก
          </Button>
          <Button 
            type="submit" 
            disabled={loading || checkingAvailability || availabilityIssues.length > 0}
          >
            {loading ? 'กำลังบันทึก...' : (sessionData ? 'บันทึกการเปลี่ยนแปลง' : 'จัดตารางเรียน')}
          </Button>
        </div>
      </form>
    </Form>
  );
}