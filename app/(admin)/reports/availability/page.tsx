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
  Calendar as CalendarIcon,
  Filter,
  Download,
  ChevronRight,
  MapPin,
  Phone,
  BookOpen,
  Projector,
  PenTool,
  AlertCircle
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

export default function AvailabilityReportPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState({ start: '09:00', end: '17:00' });
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

  // Load initial data
  useEffect(() => {
    loadSubjects();
  }, []);

  // Load availability when filters change
  useEffect(() => {
    if (selectedBranch && selectedDate) {
      loadAvailability();
    }
  }, [selectedBranch, selectedDate, timeRange]);

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
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      
      // Add 1 hour
      currentHour += 1;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">รายงานห้องและครูว่าง</h1>
          <p className="text-gray-600 mt-1">
            ตรวจสอบห้องเรียนและครูที่ว่างในแต่ละช่วงเวลา
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">สาขา</label>
              <BranchSelector 
                value={selectedBranch}
                onValueChange={setSelectedBranch}
                showAllOption={false}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">วันที่</label>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                onClick={() => {
                  // TODO: Show calendar popover
                }}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDate(selectedDate, 'long')}
              </Button>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">เวลาเริ่ม</label>
              <Select
                value={timeRange.start}
                onValueChange={(value) => setTimeRange(prev => ({ ...prev, start: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 8).map(hour => (
                    <SelectItem key={hour} value={`${String(hour).padStart(2, '0')}:00`}>
                      {`${String(hour).padStart(2, '0')}:00`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">เวลาสิ้นสุด</label>
              <Select
                value={timeRange.end}
                onValueChange={(value) => setTimeRange(prev => ({ ...prev, end: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 9).map(hour => (
                    <SelectItem key={hour} value={`${String(hour).padStart(2, '0')}:00`}>
                      {`${String(hour).padStart(2, '0')}:00`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Summary Cards */}
      {selectedBranch && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">ห้องทั้งหมด</p>
                  <p className="text-2xl font-bold">{roomAvailability.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">ห้องว่าง</p>
                  <p className="text-2xl font-bold text-green-600">
                    {getAvailableRoomCount()}
                  </p>
                </div>
                <Building2 className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">ครูทั้งหมด</p>
                  <p className="text-2xl font-bold">{teacherAvailability.length}</p>
                </div>
                <Users className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">ครูว่าง</p>
                  <p className="text-2xl font-bold text-green-600">
                    {getAvailableTeacherCount()}
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {selectedBranch && !loading && (
        <Tabs defaultValue="rooms" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rooms">ห้องว่าง</TabsTrigger>
            <TabsTrigger value="teachers">ครูว่าง</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
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
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">เวลา</th>
                        {roomAvailability.map(({ room }) => (
                          <th key={room.id} className="text-center p-3 font-medium min-w-[120px]">
                            {room.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {generateTimeSlots(timeRange.start, timeRange.end).map((slot, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-3 font-medium">
                            {slot.startTime} - {slot.endTime}
                          </td>
                          {roomAvailability.map(({ room, slots }) => {
                            const roomSlot = slots[idx];
                            return (
                              <td 
                                key={room.id} 
                                className={cn(
                                  "p-3 text-center",
                                  roomSlot?.available 
                                    ? "bg-green-50" 
                                    : "bg-red-50"
                                )}
                              >
                                {roomSlot?.available ? (
                                  <Badge 
                                    variant="outline" 
                                    className="text-green-600 border-green-500 bg-green-50"
                                  >
                                    ว่าง
                                  </Badge>
                                ) : (
                                  <div className="text-xs">
                                    {roomSlot?.conflicts?.map((c, i) => (
                                      <div key={i} className="text-red-600">
                                        {c.name}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
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