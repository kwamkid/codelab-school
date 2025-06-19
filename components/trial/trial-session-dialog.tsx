// components/trial/trial-session-dialog.tsx

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn, formatCurrency, getDaysOfWeekDisplay } from '@/lib/utils';
import { 
  CalendarIcon, 
  Clock, 
  MapPin,
  User,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  BookOpen,
  School,
  DoorOpen,
  Search,
  Filter,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { Subject, Teacher, Branch, Room, Class } from '@/types/models';
import { getRoomsByBranch } from '@/lib/services/rooms';
import { createTrialSession } from '@/lib/services/trial-bookings';
import { getClasses } from '@/lib/services/classes';
import { checkAvailability } from '@/lib/utils/availability';

interface TrialSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
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
}

interface FormData {
  studentName: string;
  subjectId: string;
  classId: string;
  branchId: string;
  scheduledDate: Date | undefined;
  startTime: string;
  endTime: string;
  teacherId: string;
  roomId: string;
}

export default function TrialSessionDialog({
  isOpen,
  onClose,
  bookingId,
  students,
  subjects,
  teachers,
  branches,
  onSuccess
}: TrialSessionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [availabilityIssues, setAvailabilityIssues] = useState<string[]>([]);
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  
  // Form data
  const [formData, setFormData] = useState<FormData>({
    studentName: '',
    subjectId: '',
    classId: '',
    branchId: '',
    scheduledDate: undefined,
    startTime: '',
    endTime: '',
    teacherId: '',
    roomId: ''
  });

  // Get student's preferred subjects
  const getStudentPreferredSubjects = () => {
    if (!selectedStudent) return [];
    const student = students.find(s => s.name === selectedStudent);
    if (!student) return [];
    
    return student.subjectInterests.map(subjectId => 
      subjects.find(s => s.id === subjectId)
    ).filter(Boolean) as Subject[];
  };

  // Filter teachers based on subject and branch
  const getAvailableTeachers = () => {
    if (!formData.subjectId || !formData.branchId) return [];
    
    return teachers.filter(teacher => 
      teacher.specialties.includes(formData.subjectId) &&
      teacher.availableBranches.includes(formData.branchId)
    );
  };

  // Load rooms when branch changes
  useEffect(() => {
    if (formData.branchId) {
      loadRooms(formData.branchId);
      loadClassesForBranch(formData.branchId);
    } else {
      setRooms([]);
      setClasses([]);
      setFilteredClasses([]);
      setFormData(prev => ({ ...prev, roomId: '', classId: '' }));
    }
  }, [formData.branchId]);

  // Filter classes when search term or filter changes
  useEffect(() => {
    filterClasses();
  }, [classes, classSearchTerm, selectedSubjectFilter, formData.subjectId]);

  // Auto-select subject when class is selected
  useEffect(() => {
    if (formData.classId) {
      const selectedClass = classes.find(c => c.id === formData.classId);
      if (selectedClass) {
        setFormData(prev => ({ 
          ...prev, 
          subjectId: selectedClass.subjectId,
          teacherId: selectedClass.teacherId,
          roomId: selectedClass.roomId,
          startTime: selectedClass.startTime,
          endTime: selectedClass.endTime
        }));
      }
    }
  }, [formData.classId, classes]);

  // Auto-calculate end time when start time changes
  useEffect(() => {
    if (formData.startTime) {
      const [hours, minutes] = formData.startTime.split(':').map(Number);
      const endHour = hours + 1; // 1 hour session
      const endTime = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, endTime }));
    }
  }, [formData.startTime]);

  // Check availability when all required fields are filled
  useEffect(() => {
    if (formData.scheduledDate && formData.startTime && formData.endTime && 
        formData.branchId && formData.roomId && formData.teacherId) {
      checkRoomAvailability();
    } else {
      setAvailabilityIssues([]);
    }
  }, [formData.scheduledDate, formData.startTime, formData.endTime, 
      formData.branchId, formData.roomId, formData.teacherId]);

  const loadRooms = async (branchId: string) => {
    try {
      const roomsData = await getRoomsByBranch(branchId);
      setRooms(roomsData.filter(r => r.isActive));
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast.error('ไม่สามารถโหลดข้อมูลห้องได้');
    }
  };

  const loadClassesForBranch = async (branchId: string) => {
    try {
      const allClasses = await getClasses();
      const branchClasses = allClasses.filter(cls => 
        cls.branchId === branchId && 
        (cls.status === 'published' || cls.status === 'started') &&
        cls.enrolledCount < cls.maxStudents
      );
      setClasses(branchClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('ไม่สามารถโหลดข้อมูลคลาสได้');
    }
  };

  const filterClasses = () => {
    let filtered = [...classes];
    
    // Filter by search term
    if (classSearchTerm) {
      filtered = filtered.filter(cls => 
        cls.name.toLowerCase().includes(classSearchTerm.toLowerCase()) ||
        cls.code.toLowerCase().includes(classSearchTerm.toLowerCase())
      );
    }
    
    // Filter by subject
    if (selectedSubjectFilter !== 'all') {
      filtered = filtered.filter(cls => cls.subjectId === selectedSubjectFilter);
    }
    
    // Sort preferred subjects first
    const preferredSubjectIds = getStudentPreferredSubjects().map(s => s.id);
    filtered.sort((a, b) => {
      const aIsPreferred = preferredSubjectIds.includes(a.subjectId);
      const bIsPreferred = preferredSubjectIds.includes(b.subjectId);
      if (aIsPreferred && !bIsPreferred) return -1;
      if (!aIsPreferred && bIsPreferred) return 1;
      return 0;
    });
    
    setFilteredClasses(filtered);
  };

  const checkRoomAvailability = async () => {
    if (!formData.scheduledDate || !formData.startTime || !formData.endTime || 
        !formData.branchId || !formData.roomId || !formData.teacherId) {
      return;
    }

    setCheckingAvailability(true);
    setAvailabilityIssues([]);

    try {
      const result = await checkAvailability({
        date: formData.scheduledDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        branchId: formData.branchId,
        roomId: formData.roomId,
        teacherId: formData.teacherId
      });

      if (!result.available) {
        setAvailabilityIssues(result.reasons.map(r => r.message));
      }
    } catch (error) {
      console.error('Error checking availability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async () => {
    // Validate
    if (!selectedStudent) {
      toast.error('กรุณาเลือกนักเรียน');
      return;
    }
    if (!formData.subjectId) {
      toast.error('กรุณาเลือกวิชา');
      return;
    }
    if (!formData.branchId) {
      toast.error('กรุณาเลือกสาขา');
      return;
    }
    if (!formData.scheduledDate) {
      toast.error('กรุณาเลือกวันที่');
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      toast.error('กรุณาระบุเวลา');
      return;
    }
    if (!formData.teacherId) {
      toast.error('กรุณาเลือกครู');
      return;
    }
    if (!formData.roomId) {
      toast.error('กรุณาเลือกห้อง');
      return;
    }
    if (availabilityIssues.length > 0) {
      toast.error('ไม่สามารถจองเวลานี้ได้เนื่องจากมีปัญหาความพร้อมใช้งาน');
      return;
    }

    setLoading(true);

    try {
      const selectedRoom = rooms.find(r => r.id === formData.roomId);
      
      await createTrialSession({
        bookingId,
        studentName: selectedStudent,
        subjectId: formData.subjectId,
        scheduledDate: formData.scheduledDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        teacherId: formData.teacherId,
        branchId: formData.branchId,
        roomId: formData.roomId,
        roomName: selectedRoom?.name,
        status: 'scheduled',
        // Store class reference if selected
        ...(formData.classId && { relatedClassId: formData.classId })
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

  const preferredSubjects = getStudentPreferredSubjects();
  const availableTeachers = getAvailableTeachers();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>นัดหมายทดลองเรียน</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Select Student */}
          <div className="space-y-2">
            <Label>นักเรียน</Label>
            <Select 
              value={selectedStudent} 
              onValueChange={(value) => {
                setSelectedStudent(value);
                setFormData(prev => ({ ...prev, studentName: value }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกนักเรียน" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student, idx) => (
                  <SelectItem key={idx} value={student.name}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{student.name}</span>
                      {student.schoolName && (
                        <span className="text-sm text-gray-500">
                          ({student.schoolName})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStudent && (
            <>
              {/* Class Selection - NEW SECTION */}
              {formData.branchId && (
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <School className="h-4 w-4" />
                    เลือกคลาส (Optional - ถ้าต้องการจองเข้าคลาสที่มีอยู่แล้ว)
                  </Label>
                  
                  {/* Filters */}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="ค้นหาชื่อคลาส..."
                        value={classSearchTerm}
                        onChange={(e) => setClassSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedSubjectFilter} onValueChange={setSelectedSubjectFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            ทุกวิชา
                          </div>
                        </SelectItem>
                        {subjects.map(subject => (
                          <SelectItem key={subject.id} value={subject.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: subject.color }}
                              />
                              {subject.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Class List */}
                  <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                    {filteredClasses.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <School className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">ไม่พบคลาสที่เปิดรับสมัคร</p>
                      </div>
                    ) : (
                      filteredClasses.map(cls => {
                        const subject = subjects.find(s => s.id === cls.subjectId);
                        const teacher = teachers.find(t => t.id === cls.teacherId);
                        const room = rooms.find(r => r.id === cls.roomId);
                        const isSelected = formData.classId === cls.id;
                        const isPreferred = getStudentPreferredSubjects().some(s => s.id === cls.subjectId);
                        
                        return (
                          <Card
                            key={cls.id}
                            className={cn(
                              "p-3 cursor-pointer transition-all",
                              isSelected ? "border-red-500 bg-red-50" : "hover:border-gray-300",
                              isPreferred && "ring-2 ring-amber-200"
                            )}
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              classId: isSelected ? '' : cls.id 
                            }))}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{cls.name}</h4>
                                  {isPreferred && (
                                    <Badge variant="outline" className="text-xs bg-amber-50">
                                      วิชาที่สนใจ
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                  <Badge style={{ backgroundColor: subject?.color || '#666' }}>
                                    {subject?.name}
                                  </Badge>
                                  <span>{cls.code}</span>
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {getDaysOfWeekDisplay(cls.daysOfWeek)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {cls.startTime} - {cls.endTime}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    ครู{teacher?.nickname || teacher?.name}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <DoorOpen className="h-3 w-3" />
                                    {room?.name}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">{formatCurrency(cls.pricing.totalPrice)}</div>
                                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                  <Users className="h-3 w-3" />
                                  {cls.enrolledCount}/{cls.maxStudents}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <Badge className="mt-2 bg-red-100 text-red-700">
                                เลือกคลาสนี้
                              </Badge>
                            )}
                          </Card>
                        );
                      })
                    )}
                  </div>
                  
                  {formData.classId && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        เลือกคลาสแล้ว - ข้อมูลวิชา เวลา ครู และห้อง จะถูกกรอกอัตโนมัติตามคลาสที่เลือก
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Subject Selection with preferred subjects shown */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  วิชา {formData.classId && "(เลือกจากคลาสแล้ว)"}
                </Label>
                
                {preferredSubjects.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-2">วิชาที่สนใจ:</p>
                    <div className="flex flex-wrap gap-2">
                      {preferredSubjects.map((subject) => (
                        <Badge 
                          key={subject.id}
                          className="cursor-pointer"
                          style={{ 
                            backgroundColor: formData.subjectId === subject.id ? subject.color : `${subject.color}20`,
                            color: formData.subjectId === subject.id ? 'white' : subject.color,
                            borderColor: subject.color
                          }}
                          onClick={() => setFormData(prev => ({ ...prev, subjectId: subject.id }))}
                        >
                          {subject.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Show all subjects grouped by category */}
                <Select 
                  value={formData.subjectId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, subjectId: value }))}
                  disabled={!!formData.classId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกวิชา" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="space-y-4">
                      {/* Preferred subjects first */}
                      {preferredSubjects.length > 0 && (
                        <div>
                          <div className="px-2 py-1.5 text-xs font-medium text-gray-500">วิชาที่สนใจ</div>
                          {preferredSubjects.map((subject) => (
                            <SelectItem key={`pref-${subject.id}`} value={subject.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: subject.color }}
                                />
                                <span>{subject.name}</span>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  สนใจ
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      )}
                      
                      {/* All subjects grouped by category */}
                      {['Coding', 'Robotics', 'AI', 'Other'].map(category => {
                        const categorySubjects = subjects.filter(s => s.category === category);
                        if (categorySubjects.length === 0) return null;
                        
                        return (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                              {category}
                            </div>
                            {categorySubjects.map((subject) => {
                              const isPreferred = preferredSubjects.some(s => s.id === subject.id);
                              return (
                                <SelectItem key={subject.id} value={subject.id}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: subject.color }}
                                    />
                                    <span>{subject.name}</span>
                                    <span className="text-xs text-gray-500 ml-1">
                                      ({subject.level})
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </SelectContent>
                </Select>
                
                {/* Note about changing subjects */}
                {formData.subjectId && !preferredSubjects.some(s => s.id === formData.subjectId) && (
                  <p className="text-xs text-amber-600 mt-2">
                    <AlertCircle className="inline h-3 w-3 mr-1" />
                    เลือกวิชาที่ต่างจากที่สนใจเดิม (อาจจะง่ายหรือยากกว่า)
                  </p>
                )}
              </div>

              {/* Branch Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  สาขา
                </Label>
                <Select 
                  value={formData.branchId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, branchId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสาขา" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    วันที่
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.scheduledDate && "text-muted-foreground"
                        )}
                      >
                        {formData.scheduledDate ? (
                          format(formData.scheduledDate, 'PPP', { locale: th })
                        ) : (
                          <span>เลือกวันที่</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.scheduledDate}
                        onSelect={(date) => setFormData(prev => ({ ...prev, scheduledDate: date }))}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      เวลาเริ่ม {formData.classId && "(ตามคลาส)"}
                    </Label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      disabled={!!formData.classId}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>เวลาสิ้นสุด {formData.classId && "(ตามคลาส)"}</Label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                      disabled={!!formData.classId}
                    />
                  </div>
                </div>
              </div>

              {/* Teacher and Room Selection */}
              {formData.subjectId && formData.branchId && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      ครูผู้สอน {formData.classId && "(ตามคลาส)"}
                    </Label>
                    <Select 
                      value={formData.teacherId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, teacherId: value }))}
                      disabled={!!formData.classId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกครู" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTeachers.length === 0 ? (
                          <div className="p-2 text-sm text-gray-500 text-center">
                            ไม่มีครูที่สอนวิชานี้ในสาขาที่เลือก
                          </div>
                        ) : (
                          availableTeachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.nickname || teacher.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DoorOpen className="h-4 w-4" />
                      ห้อง {formData.classId && "(ตามคลาส)"}
                    </Label>
                    <Select 
                      value={formData.roomId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, roomId: value }))}
                      disabled={!formData.branchId || !!formData.classId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !formData.branchId ? "เลือกสาขาก่อน" : "เลือกห้อง"
                        } />
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
              )}

              {/* Availability Check */}
              {checkingAvailability && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>กำลังตรวจสอบความพร้อมใช้งาน...</AlertDescription>
                </Alert>
              )}

              {availabilityIssues.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">ไม่สามารถจองเวลานี้ได้:</p>
                      {availabilityIssues.map((issue, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {formData.scheduledDate && formData.startTime && formData.endTime && 
               formData.branchId && formData.roomId && formData.teacherId && 
               availabilityIssues.length === 0 && !checkingAvailability && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    ห้องว่างและสามารถจองได้
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || checkingAvailability || availabilityIssues.length > 0 || !selectedStudent}
              className="bg-red-500 hover:bg-red-600"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'จัดตารางเรียน'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}