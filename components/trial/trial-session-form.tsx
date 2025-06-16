// components/trial/trial-session-form.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  CalendarIcon, 
  Clock, 
  MapPin, 
  User,
  GraduationCap,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Subject, Teacher, Branch, Room } from '@/types/models';
import { createTrialSession, checkTrialRoomAvailability } from '@/lib/services/trial-bookings';
import { getRoomsByBranch } from '@/lib/services/rooms';
import { cn } from '@/lib/utils';

interface TrialSessionFormProps {
  bookingId: string;
  students: Array<{
    name: string;
    schoolName?: string;
    gradeLevel?: string;
    subjectInterests: string[];
  }>;
  subjects: Subject[];
  teachers: Teacher[];
  branches: Branch[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TrialSessionForm({
  bookingId,
  students,
  subjects,
  teachers,
  branches,
  onSuccess,
  onCancel
}: TrialSessionFormProps) {
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [availabilityError, setAvailabilityError] = useState('');
  
  // Form state
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');

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
    if (startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const endHour = hours + 1; // 1 hour session
      const endMinutes = minutes.toString().padStart(2, '0');
      setEndTime(`${endHour.toString().padStart(2, '0')}:${endMinutes}`);
    }
  }, [startTime]);

  // Check room availability when all fields are filled
  useEffect(() => {
    if (selectedDate && startTime && endTime && selectedBranch && selectedRoom) {
      checkAvailability();
    } else {
      setAvailabilityError('');
    }
  }, [selectedDate, startTime, endTime, selectedBranch, selectedRoom]);

  const loadRooms = async (branchId: string) => {
    try {
      const data = await getRoomsByBranch(branchId);
      setRooms(data.filter(r => r.isActive));
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
        endTime
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!selectedStudent) {
      toast.error('กรุณาเลือกนักเรียน');
      return;
    }
    if (!selectedSubject) {
      toast.error('กรุณาเลือกวิชา');
      return;
    }
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
      // Get room name for storing in session
      const selectedRoomData = rooms.find(r => r.id === selectedRoom);
      
      await createTrialSession({
        bookingId,
        studentName: selectedStudent,
        subjectId: selectedSubject,
        scheduledDate: selectedDate,
        startTime,
        endTime,
        teacherId: selectedTeacher,
        branchId: selectedBranch,
        roomId: selectedRoom,
        roomName: selectedRoomData?.name || selectedRoom, // Store room name
        status: 'scheduled'
      });

      toast.success('นัดหมายทดลองเรียนสำเร็จ');
      onSuccess();
    } catch (error) {
      console.error('Error creating trial session:', error);
      toast.error('เกิดข้อผิดพลาดในการนัดหมาย');
    } finally {
      setLoading(false);
    }
  };

  // Filter subjects based on selected student's interests
  const getAvailableSubjects = () => {
    if (!selectedStudent) return [];
    const student = students.find(s => s.name === selectedStudent);
    if (!student) return [];
    
    // Get student's interested subjects first, then other subjects
    const interestedSubjects = subjects.filter(subject => 
      student.subjectInterests.includes(subject.id)
    );
    const otherSubjects = subjects.filter(subject => 
      !student.subjectInterests.includes(subject.id)
    );
    
    return [...interestedSubjects, ...otherSubjects];
  };

  // Filter teachers based on selected subject
  const getAvailableTeachers = () => {
    if (!selectedSubject) return [];
    return teachers.filter(teacher => 
      teacher.specialties.includes(selectedSubject)
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Student Selection */}
      <div className="space-y-2">
        <Label>เลือกนักเรียน</Label>
        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
          <SelectTrigger>
            <SelectValue placeholder="เลือกนักเรียน" />
          </SelectTrigger>
          <SelectContent>
            {students.map((student) => (
              <SelectItem key={student.name} value={student.name}>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{student.name}</span>
                  {student.gradeLevel && (
                    <span className="text-gray-500">({student.gradeLevel})</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subject Selection */}
      {selectedStudent && (
        <div className="space-y-2">
          <Label>เลือกวิชา</Label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกวิชา" />
            </SelectTrigger>
            <SelectContent>
              {getAvailableSubjects().map((subject, index) => {
                const student = students.find(s => s.name === selectedStudent);
                const isInterested = student?.subjectInterests.includes(subject.id);
                
                return (
                  <React.Fragment key={subject.id}>
                    {index === 0 && isInterested && (
                      <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                        วิชาที่สนใจ
                      </div>
                    )}
                    {index > 0 && isInterested && !getAvailableSubjects()[index - 1]?.id && (
                      <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                        วิชาที่สนใจ
                      </div>
                    )}
                    {student?.subjectInterests.length > 0 && 
                     index === student.subjectInterests.length && 
                     !isInterested && (
                      <div className="my-1 border-t" />
                    )}
                    {index === student?.subjectInterests.length && !isInterested && (
                      <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                        วิชาอื่น ๆ
                      </div>
                    )}
                    <SelectItem value={subject.id}>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        <span>{subject.name}</span>
                        <span className="text-gray-500">({subject.level})</span>
                        {isInterested && (
                          <Badge className="ml-2 bg-green-100 text-green-700 text-xs">
                            สนใจ
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  </React.Fragment>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date & Time */}
      {selectedSubject && (
        <>
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
                {getAvailableTeachers().map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{teacher.nickname || teacher.name}</span>
                    </div>
                  </SelectItem>
                ))}
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
                    // Check availability for each room
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

          {/* Availability Check */}
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
        </>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          ยกเลิก
        </Button>
        <Button 
          type="submit"
          disabled={loading || !!availabilityError}
          className="bg-red-500 hover:bg-red-600"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            'นัดหมาย'
          )}
        </Button>
      </div>
    </form>
  );
}