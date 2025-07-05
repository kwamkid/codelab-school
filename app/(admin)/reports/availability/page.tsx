// app/(admin)/reports/availability/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BranchSelector } from '@/components/ui/branch-selector';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  Clock, 
  Filter,
  MapPin,
  Phone,
  BookOpen,
  Projector,
  PenTool,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { formatDate, formatTime, getDayName } from '@/lib/utils';
import { getDayConflicts } from '@/lib/utils/availability';
import { getRoomsByBranch } from '@/lib/services/rooms';
import { getTeachersByBranch } from '@/lib/services/teachers';
import { getSubjects } from '@/lib/services/subjects';
import { Room, Teacher, Subject } from '@/types/models';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  conflicts?: Array<{
    type: 'class' | 'makeup' | 'trial';
    name: string;
  }>;
}

interface RoomAvailability {
  room: Room;
  slots: TimeSlot[];
}

interface TeacherAvailability {
  teacher: Teacher;
  slots: TimeSlot[];
  specialties: Subject[];
}

// Generate time options (00:00, 00:30, 01:00, ...)
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    options.push(`${String(hour).padStart(2, '0')}:00`);
    options.push(`${String(hour).padStart(2, '0')}:30`);
  }
  return options;
};

const timeOptions = generateTimeOptions();

export default function AvailabilityReportPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState({ start: '08:00', end: '19:00' });
  const [timeAlignment, setTimeAlignment] = useState<'00' | '30'>('30'); // เปลี่ยน default เป็น '30'
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [roomAvailability, setRoomAvailability] = useState<RoomAvailability[]>([]);
  const [teacherAvailability, setTeacherAvailability] = useState<TeacherAvailability[]>([]);
  const [dayInfo, setDayInfo] = useState<{
    isHoliday: boolean;
    holidayName?: string;
    busySlots: any[];
  } | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Load initial data
  useEffect(() => {
    loadSubjects();
  }, []);

  // Load availability when filters change
  useEffect(() => {
    if (selectedBranch && selectedDate) {
      loadAvailability();
    }
  }, [selectedBranch, selectedDate, timeRange, timeAlignment]);

  const loadSubjects = async () => {
    try {
      const data = await getSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadAvailability = async () => {
    if (!selectedBranch) return;
    
    setLoading(true);
    try {
      // Get day conflicts
      const conflicts = await getDayConflicts(selectedDate, selectedBranch);
      setDayInfo(conflicts);

      // Get rooms
      const rooms = await getRoomsByBranch(selectedBranch);
      const roomData = processRoomAvailability(rooms, conflicts.busySlots);
      setRoomAvailability(roomData);

      // Get teachers
      const teachers = await getTeachersByBranch(selectedBranch);
      setTeachers(teachers);
      const teacherData = await processTeacherAvailability(teachers, conflicts.busySlots);
      setTeacherAvailability(teacherData);

    } catch (error) {
      console.error('Error loading availability:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const processRoomAvailability = (
    rooms: Room[], 
    busySlots: any[]
  ): RoomAvailability[] => {
    return rooms.map(room => {
      const slots = generateTimeSlots(timeRange.start, timeRange.end);
      
      // Mark busy slots
      slots.forEach(slot => {
        const conflicts = busySlots.filter(busy => 
          busy.roomId === room.id &&
          isTimeOverlap(slot.startTime, slot.endTime, busy.startTime, busy.endTime)
        );
        
        if (conflicts.length > 0) {
          slot.available = false;
          slot.conflicts = conflicts.map(c => ({
            type: c.type,
            name: c.name
          }));
        }
      });
      
      return { room, slots };
    });
  };

  const processTeacherAvailability = async (
    teachers: Teacher[], 
    busySlots: any[]
  ): Promise<TeacherAvailability[]> => {
    return Promise.all(teachers.map(async teacher => {
      const slots = generateTimeSlots(timeRange.start, timeRange.end);
      
      // Mark busy slots
      slots.forEach(slot => {
        const conflicts = busySlots.filter(busy => 
          busy.teacherId === teacher.id &&
          isTimeOverlap(slot.startTime, slot.endTime, busy.startTime, busy.endTime)
        );
        
        if (conflicts.length > 0) {
          slot.available = false;
          slot.conflicts = conflicts.map(c => ({
            type: c.type,
            name: c.name
          }));
        }
      });
      
      // Get teacher specialties
      const teacherSpecialties = subjects.filter(s => 
        teacher.specialties.includes(s.id)
      );
      
      return { teacher, slots, specialties: teacherSpecialties };
    }));
  };

  const generateTimeSlots = (start: string, end: string): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    let [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    // Adjust start time based on alignment preference
    if (timeAlignment === '30' && startMin === 0) {
      startMin = 30;
    } else if (timeAlignment === '00' && startMin === 30) {
      startHour += 1;
      startMin = 0;
    }
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      
      // Add 1 hour
      currentHour += 1;
      
      // Don't exceed end time
      if (currentHour > endHour || (currentHour === endHour && currentMin > endMin)) {
        currentHour = endHour;
        currentMin = endMin;
      }
      
      const slotEnd = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      
      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        available: true
      });
    }
    
    return slots;
  };

  const isTimeOverlap = (
    start1: string, end1: string, 
    start2: string, end2: string
  ): boolean => {
    return start1 < end2 && end1 > start2;
  };

  const getAvailableRoomCount = () => {
    return roomAvailability.filter(r => 
      r.slots.some(s => s.available)
    ).length;
  };

  const getAvailableTeacherCount = () => {
    return teacherAvailability.filter(t => 
      t.slots.some(s => s.available)
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">รายงานห้องและครูว่าง</h1>
        <p className="text-gray-600 mt-1">
          ตรวจสอบห้องเรียนและครูที่ว่างในแต่ละช่วงเวลา
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-lg">ตัวกรองการค้นหา</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* สาขา */}
            <div className="md:col-span-3">
              <label className="text-sm font-medium mb-2 block">สาขา</label>
              <BranchSelector 
                value={selectedBranch}
                onValueChange={setSelectedBranch}
                showAllOption={false}
              />
            </div>
            
            {/* วันที่ */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">วันที่</label>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent h-9"
              />
            </div>
            
            {/* เวลาเริ่ม */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">เริ่ม</label>
              <Select
                value={timeRange.start}
                onValueChange={(value) => setTimeRange(prev => ({ ...prev, start: value }))}
              >
                <SelectTrigger>
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>
                      {time} น.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* เวลาสิ้นสุด */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">สิ้นสุด</label>
              <Select
                value={timeRange.end}
                onValueChange={(value) => setTimeRange(prev => ({ ...prev, end: value }))}
              >
                <SelectTrigger>
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.filter(time => time > timeRange.start).map(time => (
                    <SelectItem key={time} value={time}>
                      {time} น.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* แสดงช่วงเวลา */}
            <div className="md:col-span-3">
              <label className="text-sm font-medium mb-2 block">แสดงช่วง</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="alignment"
                    checked={timeAlignment === '00'}
                    onChange={() => setTimeAlignment('00')}
                    className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                  <span className={cn(
                    "text-sm font-medium",
                    timeAlignment === '00' ? "text-gray-900" : "text-gray-500"
                  )}>xx:00</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="alignment"
                    checked={timeAlignment === '30'}
                    onChange={() => setTimeAlignment('30')}
                    className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                  <span className={cn(
                    "text-sm font-medium",
                    timeAlignment === '30' ? "text-gray-900" : "text-gray-500"
                  )}>xx:30</span>
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holiday Alert */}
      {dayInfo?.isHoliday && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <p className="font-medium text-red-900">วันนี้เป็นวันหยุด</p>
            <p className="text-sm text-red-700">{dayInfo.holidayName}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {selectedBranch && !loading && (
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="rooms">ห้องว่าง</TabsTrigger>
            <TabsTrigger value="teachers">ครูว่าง</TabsTrigger>
          </TabsList>

          {/* Rooms Tab */}
          <TabsContent value="rooms">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roomAvailability.map(({ room, slots }) => {
                const availableSlots = slots.filter(s => s.available);
                const isAvailable = availableSlots.length > 0;
                
                return (
                  <Card key={room.id} className={cn(
                    "transition-all",
                    !isAvailable && "opacity-60"
                  )}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {room.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <Users className="h-4 w-4" />
                            <span>ความจุ {room.capacity} คน</span>
                          </div>
                        </div>
                        <Badge 
                          variant={isAvailable ? "default" : "secondary"}
                          className={isAvailable ? "bg-green-100 text-green-700 border-green-200" : ""}
                        >
                          {isAvailable ? "ว่าง" : "ไม่ว่าง"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex gap-2 text-sm">
                          {room.floor && (
                            <Badge variant="outline">
                              <MapPin className="h-3 w-3 mr-1" />
                              ชั้น {room.floor}
                            </Badge>
                          )}
                          {room.hasProjector && (
                            <Badge variant="outline">
                              <Projector className="h-3 w-3 mr-1" />
                              Projector
                            </Badge>
                          )}
                          {room.hasWhiteboard && (
                            <Badge variant="outline">
                              <PenTool className="h-3 w-3 mr-1" />
                              Whiteboard
                            </Badge>
                          )}
                        </div>
                        
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">ช่วงเวลาว่าง:</p>
                          {availableSlots.length > 0 ? (
                            <div className="space-y-1">
                              {mergeConsecutiveSlots(availableSlots).map((slot, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className="text-green-600 border-green-500 bg-green-50"
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    {slot.startTime} - {slot.endTime}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">ไม่มีช่วงเวลาว่าง</p>
                          )}
                        </div>
                        
                        {slots.filter(s => !s.available).length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm font-medium mb-2 text-gray-600">ตารางการใช้งาน:</p>
                            <div className="space-y-1">
                              {slots.filter(s => !s.available).map((slot, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="text-gray-500">
                                    {slot.startTime} - {slot.endTime}:
                                  </span>
                                  <span className="ml-2 text-gray-700">
                                    {slot.conflicts?.map(c => c.name).join(', ')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teacherAvailability.map(({ teacher, slots, specialties }) => {
                const availableSlots = slots.filter(s => s.available);
                const isAvailable = availableSlots.length > 0;
                
                return (
                  <Card key={teacher.id} className={cn(
                    "transition-all",
                    !isAvailable && "opacity-60"
                  )}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {teacher.nickname || teacher.name}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            <Phone className="inline h-3 w-3 mr-1" />
                            {teacher.phone}
                          </p>
                        </div>
                        <Badge 
                          variant={isAvailable ? "default" : "secondary"}
                          className={isAvailable ? "bg-green-100 text-green-700 border-green-200" : ""}
                        >
                          {isAvailable ? "ว่าง" : "ไม่ว่าง"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-1">วิชาที่สอน:</p>
                          <div className="flex flex-wrap gap-1">
                            {specialties.map(subject => (
                              <Badge 
                                key={subject.id} 
                                variant="outline"
                                style={{
                                  backgroundColor: `${subject.color}20`,
                                  borderColor: subject.color,
                                  color: subject.color
                                }}
                              >
                                {subject.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-2">ช่วงเวลาว่าง:</p>
                          {availableSlots.length > 0 ? (
                            <div className="space-y-1">
                              {mergeConsecutiveSlots(availableSlots).map((slot, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant="outline" 
                                  className="text-green-600 border-green-500 bg-green-50"
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  {slot.startTime} - {slot.endTime}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">ไม่มีช่วงเวลาว่าง</p>
                          )}
                        </div>
                        
                        {slots.filter(s => !s.available).length > 0 && (
                          <div className="pt-3 border-t">
                            <p className="text-sm font-medium mb-2 text-gray-600">ตารางสอน:</p>
                            <div className="space-y-1">
                              {slots.filter(s => !s.available).map((slot, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="text-gray-500">
                                    {slot.startTime} - {slot.endTime}:
                                  </span>
                                  <span className="ml-2 text-gray-700">
                                    {slot.conflicts?.map(c => c.name).join(', ')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <Card>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Time Header */}
                    <div className="flex border-b pb-2 mb-4">
                      <div className="w-32 font-medium text-sm">ห้อง / เวลา</div>
                      <div className="flex-1 relative h-10">
                        {/* Time labels */}
                        <div className="absolute inset-0 flex">
                          {generateTimeSlots(timeRange.start, timeRange.end).map((slot, idx) => (
                            <div 
                              key={idx} 
                              className="flex-1 text-center text-sm text-gray-600 border-l first:border-l-0"
                            >
                              {slot.startTime}
                            </div>
                          ))}
                          <div className="text-center text-sm text-gray-600 border-l px-2">
                            {timeRange.end}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Room Rows */}
                    <div className="space-y-2">
                      {roomAvailability.map(({ room }) => {
                        // Get busy slots for this room
                        const roomBusySlots = dayInfo?.busySlots.filter(slot => slot.roomId === room.id) || [];
                        
                        return (
                          <div key={room.id} className="flex items-stretch">
                            {/* Room Name */}
                            <div className="w-32 py-3 pr-4">
                              <div className="font-medium text-sm">{room.name}</div>
                              <div className="text-xs text-gray-500">จุ {room.capacity} คน</div>
                            </div>
                            
                            {/* Timeline */}
                            <div className="flex-1 relative bg-gray-50 rounded-lg h-16">
                              {/* Grid lines */}
                              <div className="absolute inset-0 flex">
                                {generateTimeSlots(timeRange.start, timeRange.end).map((_, idx) => (
                                  <div key={idx} className="flex-1 border-l border-gray-200 first:border-l-0" />
                                ))}
                                <div className="border-l border-gray-200 w-px" />
                              </div>
                              
                              {/* Busy Slots */}
                              {roomBusySlots.map((busySlot, idx) => {
                                const startPercent = getTimePercentage(busySlot.startTime, timeRange.start, timeRange.end);
                                const endPercent = getTimePercentage(busySlot.endTime, timeRange.start, timeRange.end);
                                const width = endPercent - startPercent;
                                
                                // Get subject color if it's a class
                                let bgColor = '';
                                let textColor = 'text-white';
                                
                                if (busySlot.type === 'class' && busySlot.subjectId) {
                                  const subject = subjects.find(s => s.id === busySlot.subjectId);
                                  if (subject?.color) {
                                    bgColor = subject.color;
                                    // Check if color is light to adjust text color
                                    const isLightColor = isColorLight(subject.color);
                                    textColor = isLightColor ? 'text-gray-900' : 'text-white';
                                  } else {
                                    bgColor = '#3B82F6'; // Default blue
                                  }
                                } else if (busySlot.type === 'makeup') {
                                  bgColor = '#F97316'; // Orange
                                } else if (busySlot.type === 'trial') {
                                  bgColor = '#8B5CF6'; // Purple
                                } else {
                                  bgColor = '#3B82F6'; // Default blue
                                }
                                
                                // Get teacher name for display
                                const teacher = teachers.find(t => t.id === busySlot.teacherId);
                                const teacherName = teacher?.nickname || teacher?.name || 'ไม่ระบุครู';
                                
                                // Get student info for makeup and trial
                                let studentInfo = '';
                                if (busySlot.type === 'makeup' || busySlot.type === 'trial') {
                                  const studentName = busySlot.studentName || busySlot.name.split(': ')[1] || 'นักเรียน';
                                  studentInfo = `นักเรียน: ${studentName}`;
                                }
                                
                                // Build tooltip content
                                const tooltipContent = [
                                  busySlot.name,
                                  `เวลา: ${busySlot.startTime} - ${busySlot.endTime}`,
                                  `ครู: ${teacherName}`,
                                  studentInfo
                                ].filter(Boolean).join('\n');
                                
                                return (
                                  <div
                                    key={idx}
                                    className={cn(
                                      "absolute top-2 bottom-2 rounded-md flex items-center px-2 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group",
                                      textColor
                                    )}
                                    style={{
                                      left: `${startPercent}%`,
                                      width: `${width}%`,
                                      backgroundColor: bgColor,
                                      border: `2px solid ${bgColor}`,
                                      filter: 'brightness(1.1)'
                                    }}
                                    title={tooltipContent}
                                  >
                                    <div className="text-xs font-medium truncate">
                                      {busySlot.name}
                                    </div>
                                    
                                    {/* Floating Popover */}
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-20">
                                      <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 min-w-[250px] max-w-[300px]">
                                        <div className="space-y-2">
                                          <div>
                                            <h4 className="font-semibold text-gray-900">{busySlot.name}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                              {busySlot.type === 'class' ? 'คลาสปกติ' : 
                                               busySlot.type === 'makeup' ? 'เรียนชดเชย' : 'ทดลองเรียน'}
                                            </p>
                                          </div>
                                          
                                          <div className="space-y-1 text-sm">
                                            <div className="flex items-start gap-2">
                                              <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                                              <span className="text-gray-700">{busySlot.startTime} - {busySlot.endTime}</span>
                                            </div>
                                            
                                            <div className="flex items-start gap-2">
                                              <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                                              <span className="text-gray-700">ครู: {teacherName}</span>
                                            </div>
                                            
                                            {studentInfo && (
                                              <div className="flex items-start gap-2">
                                                <UserCheck className="h-4 w-4 text-gray-400 mt-0.5" />
                                                <span className="text-gray-700">{studentInfo}</span>
                                              </div>
                                            )}
                                            
                                            {busySlot.type === 'class' && busySlot.subjectId && (
                                              <div className="flex items-start gap-2">
                                                <BookOpen className="h-4 w-4 text-gray-400 mt-0.5" />
                                                <span className="text-gray-700">
                                                  วิชา: {subjects.find(s => s.id === busySlot.subjectId)?.name || 'ไม่ระบุ'}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Arrow */}
                                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-gray-200 rotate-45"></div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Legend */}
                    <div className="mt-6 pt-4 border-t">
                      <p className="text-sm font-medium mb-3">สีแสดงประเภท:</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }}></div>
                          <span>เรียนชดเชย</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
                          <span>ทดลองเรียน</span>
                        </div>
                        <div className="text-gray-500 text-xs ml-4">
                          * คลาสปกติจะแสดงสีตามวิชา
                        </div>
                      </div>
                      
                      {/* Subject Colors */}
                      {subjects.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">สีตามวิชา:</p>
                          <div className="flex flex-wrap gap-3">
                            {subjects.filter(s => s.isActive).map(subject => (
                              <div key={subject.id} className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded border border-gray-300" 
                                  style={{ backgroundColor: subject.color }}
                                ></div>
                                <span className="text-xs">{subject.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedBranch && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">เลือกสาขาเพื่อดูข้อมูล</h3>
            <p className="text-gray-600">
              กรุณาเลือกสาขาที่ต้องการดูรายงานห้องและครูว่าง
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper function to merge consecutive time slots
function mergeConsecutiveSlots(slots: TimeSlot[]): TimeSlot[] {
  if (slots.length === 0) return [];
  
  const merged: TimeSlot[] = [];
  let current = { ...slots[0] };
  
  for (let i = 1; i < slots.length; i++) {
    if (current.endTime === slots[i].startTime) {
      current.endTime = slots[i].endTime;
    } else {
      merged.push(current);
      current = { ...slots[i] };
    }
  }
  
  merged.push(current);
  return merged;
}

// Helper function to calculate percentage position on timeline
function getTimePercentage(time: string, startTime: string, endTime: string): number {
  const [timeHour, timeMin] = time.split(':').map(Number);
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const timeInMinutes = timeHour * 60 + timeMin;
  const startInMinutes = startHour * 60 + startMin;
  const endInMinutes = endHour * 60 + endMin;
  
  const percentage = ((timeInMinutes - startInMinutes) / (endInMinutes - startInMinutes)) * 100;
  return Math.max(0, Math.min(100, percentage));
}

// Helper function to check if color is light
function isColorLight(color: string): boolean {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate brightness
  const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return brightness > 155;
}