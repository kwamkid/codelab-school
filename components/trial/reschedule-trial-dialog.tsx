// components/trial/reschedule-trial-dialog.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  CalendarIcon, 
  Clock, 
  MapPin,
  User,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { TrialSession, Teacher, Branch, Room, Subject } from '@/types/models';
import { updateTrialSession, checkTrialRoomAvailability } from '@/lib/services/trial-bookings';
import { getTeachers } from '@/lib/services/teachers';
import { getBranches } from '@/lib/services/branches';
import { getRoomsByBranch } from '@/lib/services/rooms';
import { getSubjects } from '@/lib/services/subjects';
import { cn, formatDate } from '@/lib/utils';

interface RescheduleTrialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  session: TrialSession;
  onSuccess: () => void;
}

export default function RescheduleTrialDialog({
  isOpen,
  onClose,
  session,
  onSuccess
}: RescheduleTrialDialogProps) {
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [availabilityError, setAvailabilityError] = useState('');
  
  // Master data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Form state - initialize with current values
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date(session.scheduledDate));
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [selectedTeacher, setSelectedTeacher] = useState(session.teacherId);
  const [selectedBranch, setSelectedBranch] = useState(session.branchId);
  const [selectedRoom, setSelectedRoom] = useState(session.roomId);

  // Load master data
  useEffect(() => {
    loadMasterData();
  }, []);

  // Load rooms when branch changes
  useEffect(() => {
    if (selectedBranch) {
      loadRooms(selectedBranch);
    } else {
      setRooms([]);
      setSelectedRoom('');
    }
  }, [selectedBranch]);

  // Auto-set end time when start time changes
  useEffect(() => {
    if (startTime && startTime !== session.startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const endHour = hours + 1; // 1 hour session
      const endMinutes = minutes.toString().padStart(2, '0');
      setEndTime(`${endHour.toString().padStart(2, '0')}:${endMinutes}`);
    }
  }, [startTime, session.startTime]);

  // Check room availability when all fields are filled
  useEffect(() => {
    if (selectedDate && startTime && endTime && selectedBranch && selectedRoom) {
      checkAvailability();
    } else {
      setAvailabilityError('');
    }
  }, [selectedDate, startTime, endTime, selectedBranch, selectedRoom]);

  const loadMasterData = async () => {
    try {
      const [subjectsData, teachersData, branchesData] = await Promise.all([
        getSubjects(),
        getTeachers(),
        getBranches()
      ]);
      
      setSubjects(subjectsData.filter(s => s.isActive));
      setTeachers(teachersData.filter(t => t.isActive));
      setBranches(branchesData.filter(b => b.isActive));
      
      // Load initial rooms for current branch
      if (session.branchId) {
        const roomsData = await getRoomsByBranch(session.branchId);
        setRooms(roomsData.filter(r => r.isActive));
      }
    } catch (error) {
      console.error('Error loading master data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    }
  };

  const loadRooms = async (branchId: string) => {
    try {
      const data = await getRoomsByBranch(branchId);
      setRooms(data.filter(r => r.isActive));
      
      // If current room is not in new branch, clear selection
      if (!data.find(r => r.id === selectedRoom)) {
        setSelectedRoom('');
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast.error('ไม่สามารถโหลดข้อมูลห้องได้');
    }
  };

  const checkAvailability = async () => {
    if (!selectedDate || !startTime || !endTime || !selectedBranch || !selectedRoom) {
      return;
    }

    setCheckingAvailability(true);
    setAvailabilityError('');

    try {
      const result = await checkTrialRoomAvailability(
        selectedBranch,
        selectedRoom,
        selectedDate,
        startTime,
        endTime,
        session.id // Exclude current session from check
      );

      if (!result.available && result.conflicts) {
        const conflictMessages = result.conflicts.map(c => {
          let typeLabel = '';
          if (c.type === 'class') typeLabel = 'คลาส';
          else if (c.type === 'makeup') typeLabel = 'Makeup';
          else typeLabel = 'ทดลองเรียน';
          
          return `${typeLabel} ${c.name} (${c.startTime}-${c.endTime})`;
        });
        setAvailabilityError(`ห้องไม่ว่าง: ${conflictMessages.join(', ')}`);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Filter teachers based on selected subject and branch
  const getAvailableTeachers = () => {
    return teachers.filter(teacher => 
      teacher.specialties.includes(session.subjectId) &&
      teacher.availableBranches.includes(selectedBranch)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!selectedDate) {
      toast.error('กรุณาเลือกวันที่');
      return;
    }
    if (!startTime || !endTime) {
      toast.error('กรุณาระบุเวลา');
      return;
    }
    if (!selectedTeacher) {
      toast.error('กรุณาเลือกครู');
      return;
    }
    if (!selectedBranch || !selectedRoom) {
      toast.error('กรุณาเลือกสาขาและห้อง');
      return;
    }
    if (availabilityError) {
      toast.error('ห้องไม่ว่างในช่วงเวลาที่เลือก');
      return;
    }

    setLoading(true);

    try {
      // Get room name for storing
      const selectedRoomData = rooms.find(r => r.id === selectedRoom);
      
      await updateTrialSession(session.id, {
        scheduledDate: selectedDate,
        startTime,
        endTime,
        teacherId: selectedTeacher,
        branchId: selectedBranch,
        roomId: selectedRoom,
        roomName: selectedRoomData?.name || selectedRoom
      });

      toast.success('เปลี่ยนนัดหมายสำเร็จ');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนนัดหมาย');
    } finally {
      setLoading(false);
    }
  };

  // Get current subject info
  const currentSubject = subjects.find(s => s.id === session.subjectId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เปลี่ยนนัดหมายทดลองเรียน</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div><strong>นักเรียน:</strong> {session.studentName}</div>
                <div><strong>วิชา:</strong> {currentSubject?.name || session.subjectId}</div>
                <div><strong>นัดหมายเดิม:</strong> {formatDate(session.scheduledDate, 'long')} เวลา {session.startTime} - {session.endTime}</div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>วันที่</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP', { locale: th }) : "เลือกวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>เวลาเริ่ม</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>เวลาสิ้นสุด</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Teacher */}
          <div className="space-y-2">
            <Label>เลือกครู</Label>
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกครู" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableTeachers().length === 0 ? (
                  <div className="p-2 text-sm text-gray-500 text-center">
                    ไม่มีครูที่สอนวิชานี้ในสาขาที่เลือก
                  </div>
                ) : (
                  getAvailableTeachers().map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{teacher.nickname || teacher.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Branch & Room */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>สาขา</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสาขา" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{branch.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ห้องเรียน</Label>
              <Select 
                value={selectedRoom} 
                onValueChange={setSelectedRoom}
                disabled={!selectedBranch || rooms.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedBranch ? "เลือกสาขาก่อน" : 
                    rooms.length === 0 ? "ไม่มีห้อง" : 
                    "เลือกห้อง"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => {
                    const isChecking = checkingAvailability && selectedRoom === room.id;
                    const hasConflict = availabilityError && selectedRoom === room.id;
                    
                    return (
                      <SelectItem key={room.id} value={room.id}>
                        <div className="flex items-center gap-2 w-full">
                          <span>{room.name} (จุ {room.capacity} คน)</span>
                          {selectedDate && startTime && endTime && (
                            <>
                              {isChecking && (
                                <Loader2 className="h-3 w-3 animate-spin text-gray-500 ml-auto" />
                              )}
                              {!isChecking && selectedRoom === room.id && (
                                hasConflict ? (
                                  <XCircle className="h-3 w-3 text-red-500 ml-auto" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 text-green-500 ml-auto" />
                                )
                              )}
                            </>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedDate && startTime && endTime && selectedRoom && (
                <p className="text-xs text-gray-500">
                  {checkingAvailability ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      กำลังตรวจสอบห้องว่าง...
                    </span>
                  ) : availabilityError ? (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-3 w-3" />
                      ห้องไม่ว่าง
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      ห้องว่าง
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Availability Check Alert */}
          {checkingAvailability && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>กำลังตรวจสอบห้องว่าง...</AlertDescription>
            </Alert>
          )}

          {availabilityError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{availabilityError}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              ยกเลิก
            </Button>
            <Button 
              type="submit"
              disabled={loading || !!availabilityError || checkingAvailability}
              className="bg-red-500 hover:bg-red-600"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึกการเปลี่ยนแปลง'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}