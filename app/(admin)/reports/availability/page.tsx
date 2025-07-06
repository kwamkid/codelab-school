// app/(admin)/reports/availability/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BranchSelector } from '@/components/ui/branch-selector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Clock, 
  Filter,
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
import { formatDate } from '@/lib/utils';
import { getDayConflicts } from '@/lib/utils/availability';
import { getRoomsByBranch } from '@/lib/services/rooms';
import { getTeachersByBranch } from '@/lib/services/teachers';
import { getSubjects } from '@/lib/services/subjects';
import { Room, Teacher, Subject } from '@/types/models';
import { toast } from 'sonner';
// import { useBranch } from '@/contexts/BranchContext'; // Remove this for now

// Import separated components
import { Timeline } from '@/components/reports/availability/Timeline';
import { RoomAvailability } from '@/components/reports/availability/RoomAvailability';
import { TeacherAvailability } from '@/components/reports/availability/TeacherAvailability';

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  conflicts?: Array<{
    type: 'class' | 'makeup' | 'trial';
    name: string;
  }>;
}

interface RoomAvailabilityData {
  room: Room;
  slots: TimeSlot[];
}

interface TeacherAvailabilityData {
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
  // Get current date in Thailand timezone with proper handling
  const getCurrentThaiDate = () => {
    // Create date in Thailand timezone
    const now = new Date();
    // Get Bangkok timezone offset
    const bangkokOffset = 7 * 60; // UTC+7 in minutes
    const localOffset = now.getTimezoneOffset(); // Local timezone offset in minutes
    const offsetDiff = bangkokOffset + localOffset;
    
    // Adjust the date
    const thailandDate = new Date(now.getTime() + offsetDiff * 60 * 1000);
    
    // Set to start of day
    thailandDate.setHours(0, 0, 0, 0);
    
    console.log('Current Thailand Date:', {
      original: now.toISOString(),
      adjusted: thailandDate.toISOString(),
      dateString: thailandDate.toLocaleDateString('th-TH'),
      isoDate: thailandDate.toISOString().split('T')[0]
    });
    
    return thailandDate;
  };

  // const { selectedBranchId } = useBranch(); // Will use this later when BranchProvider is set up
  const [selectedDate, setSelectedDate] = useState<Date>(getCurrentThaiDate());
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState({ start: '08:00', end: '19:00' });
  const [timeAlignment, setTimeAlignment] = useState<'00' | '30'>('30');
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [roomAvailability, setRoomAvailability] = useState<RoomAvailabilityData[]>([]);
  const [teacherAvailability, setTeacherAvailability] = useState<TeacherAvailabilityData[]>([]);
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

  // Load availability when filters change or on mount
  useEffect(() => {
    if (selectedBranch && selectedDate) {
      console.log('Loading availability with:', {
        branch: selectedBranch,
        date: selectedDate.toISOString(),
        dateLocal: selectedDate.toLocaleDateString('th-TH')
      });
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
      console.log('Loading availability for:', {
        date: selectedDate,
        dateString: selectedDate.toISOString(),
        dateLocal: selectedDate.toLocaleDateString('th-TH'),
        branch: selectedBranch,
        timeRange
      });
      
      // Get day conflicts
      const conflicts = await getDayConflicts(selectedDate, selectedBranch);
      console.log('Conflicts found:', conflicts);
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
  ): RoomAvailabilityData[] => {
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
  ): Promise<TeacherAvailabilityData[]> => {
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

  // Format date for input[type="date"]
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) return;
    
    // Parse the date properly
    const [year, month, day] = value.split('-').map(Number);
    const newDate = new Date(year, month - 1, day);
    newDate.setHours(0, 0, 0, 0);
    
    console.log('Date changed:', {
      inputValue: value,
      newDate: newDate.toISOString(),
      localDate: newDate.toLocaleDateString('th-TH')
    });
    
    setSelectedDate(newDate);
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
            {/* สาขา - ลดขนาด column */}
            <div className="md:col-span-2">
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
                value={formatDateForInput(selectedDate)}
                onChange={handleDateChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent h-9"
              />
            </div>
            
            {/* ช่วงเวลา - รวม dropdown 2 อันเข้าด้วยกัน */}
            <div className="md:col-span-4">
              <label className="text-sm font-medium mb-2 block">ช่วงเวลา</label>
              <div className="flex items-center gap-2">
                <Select
                  value={timeRange.start}
                  onValueChange={(value) => setTimeRange(prev => ({ ...prev, start: value }))}
                >
                  <SelectTrigger className="flex-1">
                    <Clock className="h-4 w-4 mr-2 text-gray-500" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {timeOptions.map(time => (
                      <SelectItem key={time} value={time}>
                        {time} น.
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <span className="text-gray-500">ถึง</span>
                
                <Select
                  value={timeRange.end}
                  onValueChange={(value) => setTimeRange(prev => ({ ...prev, end: value }))}
                >
                  <SelectTrigger className="flex-1">
                    <Clock className="h-4 w-4 mr-2 text-gray-500" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {timeOptions.filter(time => time > timeRange.start).map(time => (
                      <SelectItem key={time} value={time}>
                        {time} น.
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* แสดงช่วงเวลา - ใช้ column ที่เหลือ */}
            <div className="md:col-span-2">
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

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <Timeline 
              roomAvailability={roomAvailability}
              dayInfo={dayInfo}
              teachers={teachers}
              subjects={subjects}
              timeRange={timeRange}
              timeAlignment={timeAlignment}
            />
          </TabsContent>

          {/* Rooms Tab */}
          <TabsContent value="rooms">
            <RoomAvailability roomAvailability={roomAvailability} />
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <TeacherAvailability 
              teacherAvailability={teacherAvailability}
              timeRange={timeRange}
              timeAlignment={timeAlignment}
              subjects={subjects}
              dayInfo={dayInfo}
            />
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