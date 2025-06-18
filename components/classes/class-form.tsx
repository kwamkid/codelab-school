'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Class, Branch, Subject, Teacher, Room } from '@/types/models';
import { createClass, updateClass, checkRoomAvailability } from '@/lib/services/classes';
import { getHolidaysForBranch } from '@/lib/services/holidays';
import { getActiveBranches } from '@/lib/services/branches';
import { getActiveSubjects } from '@/lib/services/subjects';
import { getTeachersByBranch } from '@/lib/services/teachers';
import { getActiveRoomsByBranch } from '@/lib/services/rooms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { Loader2, Save, X, Calendar, AlertCircle, Plus, Info, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { generateClassCode, getDayName } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface ClassFormProps {
  classData?: Class;
  isEdit?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'อาทิตย์' },
  { value: 1, label: 'จันทร์' },
  { value: 2, label: 'อังคาร' },
  { value: 3, label: 'พุธ' },
  { value: 4, label: 'พฤหัสบดี' },
  { value: 5, label: 'ศุกร์' },
  { value: 6, label: 'เสาร์' },
];

export default function ClassForm({ classData, isEdit = false }: ClassFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [autoStatus, setAutoStatus] = useState<'draft' | 'published' | 'started' | null>(null);
  const [roomAvailability, setRoomAvailability] = useState<{
    checked: boolean;
    available: boolean;
    conflicts?: any[];
  }>({ checked: false, available: true });
  
  const [formData, setFormData] = useState({
    name: classData?.name || '',
    code: classData?.code || '',
    description: classData?.description || '',
    subjectId: classData?.subjectId || '',
    teacherId: classData?.teacherId || '',
    branchId: classData?.branchId || '',
    roomId: classData?.roomId || '',
    startDate: classData?.startDate ? new Date(classData.startDate).toISOString().split('T')[0] : '',
    endDate: classData?.endDate ? new Date(classData.endDate).toISOString().split('T')[0] : '',
    totalSessions: classData?.totalSessions || 12,
    daysOfWeek: classData?.daysOfWeek || [],
    startTime: classData?.startTime || '10:30',
    endTime: classData?.endTime || '12:30',
    maxStudents: classData?.maxStudents || 10,
    minStudents: classData?.minStudents || 3,
    enrolledCount: classData?.enrolledCount || 0,
    pricing: {
      pricePerSession: classData?.pricing?.pricePerSession || 0,
      totalPrice: classData?.pricing?.totalPrice || 15900,
      materialFee: classData?.pricing?.materialFee || 0,
      registrationFee: classData?.pricing?.registrationFee || 0,
    },
    status: classData?.status || 'draft',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Load teachers and rooms when branch changes
    if (formData.branchId) {
      loadBranchData(formData.branchId);
    }
  }, [formData.branchId]);

  useEffect(() => {
    // Generate class code when branch and subject are selected
    if (formData.branchId && formData.subjectId && !isEdit) {
      const branch = branches.find(b => b.id === formData.branchId);
      const subject = subjects.find(s => s.id === formData.subjectId);
      if (branch && subject) {
        const code = generateClassCode(branch.code, subject.code, new Date());
        setFormData(prev => ({ ...prev, code }));
      }
    }
  }, [formData.branchId, formData.subjectId, branches, subjects, isEdit]);

  useEffect(() => {
    // Calculate price per session when total price or sessions change
    if (formData.pricing.totalPrice > 0 && formData.totalSessions > 0) {
      const pricePerSession = Math.round(formData.pricing.totalPrice / formData.totalSessions);
      setFormData(prev => ({
        ...prev,
        pricing: { ...prev.pricing, pricePerSession }
      }));
    }
  }, [formData.pricing.totalPrice, formData.totalSessions]);

  useEffect(() => {
    // Calculate end date based on start date, days of week, and total sessions
    if (formData.startDate && formData.daysOfWeek.length > 0 && formData.totalSessions > 0 && formData.branchId) {
      calculateEndDate();
    }
  }, [formData.startDate, formData.daysOfWeek, formData.totalSessions, formData.branchId]);

  // เพิ่ม useEffect สำหรับตรวจสอบวันเริ่มต้นและกำหนดสถานะอัตโนมัติ
  useEffect(() => {
    if (formData.startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(formData.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      // ถ้าเป็นการสร้างใหม่ หรือ แก้ไขแต่สถานะยังไม่ใช่ started
      if (!isEdit || (isEdit && formData.status !== 'started' && formData.status !== 'completed' && formData.status !== 'cancelled')) {
        if (startDate <= today) {
          setAutoStatus('started');
          setFormData(prev => ({ ...prev, status: 'started' }));
        } else {
          setAutoStatus(null);
          // ถ้าวันเริ่มต้นเป็นอนาคต และสถานะเป็น started ให้เปลี่ยนกลับ
          if (formData.status === 'started') {
            setFormData(prev => ({ ...prev, status: 'published' }));
          }
        }
      }
    }
  }, [formData.startDate, isEdit, formData.status]);

  // เพิ่ม useEffect สำหรับตรวจสอบห้องว่างอัตโนมัติเมื่อเลือกห้อง
  useEffect(() => {
    if (formData.roomId && formData.branchId && formData.startDate && formData.endDate && 
        formData.daysOfWeek.length > 0 && formData.startTime && formData.endTime) {
      checkRoomAvailabilityAuto();
    } else {
      // Reset availability if conditions not met
      setRoomAvailability({ checked: false, available: true });
    }
  }, [formData.roomId, formData.branchId, formData.startDate, formData.endDate, 
      formData.daysOfWeek, formData.startTime, formData.endTime]);

  const loadInitialData = async () => {
    try {
      const [branchesData, subjectsData] = await Promise.all([
        getActiveBranches(),
        getActiveSubjects()
      ]);
      setBranches(branchesData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    }
  };

  const loadBranchData = async (branchId: string) => {
    try {
      const [teachersData, roomsData] = await Promise.all([
        getTeachersByBranch(branchId),
        getActiveRoomsByBranch(branchId)
      ]);
      setTeachers(teachersData);
      setRooms(roomsData);
      
      // Reset teacher and room if not available in new branch
      if (!teachersData.find(t => t.id === formData.teacherId)) {
        setFormData(prev => ({ ...prev, teacherId: '' }));
      }
      if (!roomsData.find(r => r.id === formData.roomId)) {
        setFormData(prev => ({ ...prev, roomId: '' }));
      }
    } catch (error) {
      console.error('Error loading branch data:', error);
    }
  };

  const calculateEndDate = async () => {
    try {
      const startDate = new Date(formData.startDate);
      let sessionCount = 0;
      const currentDate = new Date(startDate.getTime());
      
      // Get holidays for the branch
      const maxEndDate = new Date(startDate);
      maxEndDate.setMonth(maxEndDate.getMonth() + 6);
      
      const holidays = await getHolidaysForBranch(formData.branchId, startDate, maxEndDate);
      
      // Create a Set of holiday dates for faster lookup
      const holidayDates = new Set(
        holidays.map(h => new Date(h.date).toDateString())
      );
      
      while (sessionCount < formData.totalSessions) {
        const dayOfWeek = currentDate.getDay();
        
        // Check if it's a scheduled day and not a holiday
        if (formData.daysOfWeek.includes(dayOfWeek) && !holidayDates.has(currentDate.toDateString())) {
          sessionCount++;
        }
        
        if (sessionCount < formData.totalSessions) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      setFormData(prev => ({
        ...prev,
        endDate: currentDate.toISOString().split('T')[0]
      }));
    } catch (error) {
      console.error('Error calculating end date:', error);
      // Fallback to simple calculation without holidays
      const startDate = new Date(formData.startDate);
      let sessionCount = 0;
      const currentDate = new Date(startDate.getTime());
      
      while (sessionCount < formData.totalSessions) {
        if (formData.daysOfWeek.includes(currentDate.getDay())) {
          sessionCount++;
        }
        if (sessionCount < formData.totalSessions) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      setFormData(prev => ({
        ...prev,
        endDate: currentDate.toISOString().split('T')[0]
      }));
    }
  };

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort((a, b) => a - b)
    }));
  };

  const checkRoomAvailabilityAuto = async () => {
    setCheckingAvailability(true);
    try {
      const result = await checkRoomAvailability(
        formData.branchId,
        formData.roomId,
        formData.daysOfWeek,
        formData.startTime,
        formData.endTime,
        new Date(formData.startDate),
        new Date(formData.endDate),
        isEdit ? classData?.id : undefined
      );

      setRoomAvailability({
        checked: true,
        available: result.available,
        conflicts: result.conflicts
      });
    } catch (error) {
      console.error('Error checking availability:', error);
      setRoomAvailability({
        checked: true,
        available: false,
        conflicts: []
      });
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!formData.name || !formData.subjectId || !formData.teacherId || 
        !formData.branchId || !formData.roomId || !formData.startDate) {
      toast.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    if (formData.daysOfWeek.length === 0) {
      toast.error('กรุณาเลือกวันที่เรียนอย่างน้อย 1 วัน');
      return;
    }

    if (formData.minStudents > formData.maxStudents) {
      toast.error('จำนวนนักเรียนขั้นต่ำต้องน้อยกว่าจำนวนสูงสุด');
      return;
    }

    if (!formData.endDate) {
      toast.error('กรุณารอให้ระบบคำนวณวันจบก่อน');
      return;
    }

    // Check room availability one more time before save
    if (!roomAvailability.available) {
      toast.error('ห้องเรียนไม่ว่างในช่วงเวลานี้ กรุณาเลือกห้องอื่นหรือเปลี่ยนเวลา');
      return;
    }

    setLoading(true);

    try {
      const classPayload = {
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
      };

      if (isEdit && classData?.id) {
        await updateClass(classData.id, classPayload);
        toast.success('อัปเดตข้อมูลคลาสเรียบร้อยแล้ว');
      } else {
        await createClass(classPayload);
        toast.success('สร้างคลาสใหม่เรียบร้อยแล้ว');
      }
      
      router.push('/classes');
    } catch (error) {
      console.error('Error saving class:', error);
      toast.error(isEdit ? 'ไม่สามารถอัปเดตข้อมูลได้' : 'ไม่สามารถสร้างคลาสได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลพื้นฐาน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อคลาส *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น Python Basic Sat 14:00"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="code">รหัสคลาส</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="จะถูกสร้างอัตโนมัติ"
                  readOnly={!isEdit}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">คำอธิบาย</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="รายละเอียดเพิ่มเติมของคลาส"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch">สาขา *</Label>
                <Select
                  value={formData.branchId}
                  onValueChange={(value) => setFormData({ ...formData, branchId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสาขา" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.length === 0 ? (
                      <div className="p-2 text-center">
                        <p className="text-sm text-gray-500 mb-2">ยังไม่มีสาขา</p>
                        <Link href="/branches/new">
                          <Button size="sm" className="w-full bg-red-500 hover:bg-red-600">
                            <Plus className="h-3 w-3 mr-1" />
                            เพิ่มสาขา
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">วิชา *</Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกวิชา" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.length === 0 ? (
                      <div className="p-2 text-center">
                        <p className="text-sm text-gray-500 mb-2">ยังไม่มีวิชา</p>
                        <Link href="/subjects/new">
                          <Button size="sm" className="w-full bg-red-500 hover:bg-red-600">
                            <Plus className="h-3 w-3 mr-1" />
                            เพิ่มวิชา
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>ตารางเรียน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>วันที่เรียน *</Label>
              <p className="text-xs text-gray-500 mb-2">
                เลือกวันที่เรียนก่อน เพื่อให้ระบบกำหนดวันเริ่มเรียนที่ถูกต้อง
              </p>
              <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={formData.daysOfWeek.includes(day.value)}
                      onCheckedChange={() => handleDayToggle(day.value)}
                    />
                    <Label
                      htmlFor={`day-${day.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">เวลาเริ่ม *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">เวลาจบ *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">วันเริ่มเรียน *</Label>
                <div className="relative">
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => {
                      const selectedDate = new Date(e.target.value);
                      const selectedDay = selectedDate.getDay();
                      
                      // Check if selected date matches allowed days
                      if (formData.daysOfWeek.length > 0 && !formData.daysOfWeek.includes(selectedDay)) {
                        toast.error(`กรุณาเลือกวัน${formData.daysOfWeek.map(d => getDayName(d)).join(', ')}เท่านั้น`);
                        return;
                      }
                      
                      setFormData({ ...formData, startDate: e.target.value });
                    }}
                    required
                  />
                  {formData.daysOfWeek.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      * เลือกได้เฉพาะ{formData.daysOfWeek.map(d => getDayName(d)).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalSessions">จำนวนครั้ง *</Label>
                <Input
                  id="totalSessions"
                  type="number"
                  min="1"
                  value={formData.totalSessions}
                  onChange={(e) => setFormData({ ...formData, totalSessions: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">วันจบ (คำนวณอัตโนมัติ)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  readOnly
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">
                  * ระบบจะหลบวันหยุดให้อัตโนมัติ
                </p>
              </div>
            </div>

            {/* Teacher and Room Selection - Moved after endDate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="teacher">ครูผู้สอน *</Label>
                <Select
                  value={formData.teacherId}
                  onValueChange={(value) => setFormData({ ...formData, teacherId: value })}
                  disabled={!formData.branchId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.branchId ? "เลือกครู" : "เลือกสาขาก่อน"} />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.length === 0 ? (
                      <div className="p-2 text-center">
                        <p className="text-sm text-gray-500 mb-2">ยังไม่มีครูในสาขานี้</p>
                        <Link href="/teachers/new">
                          <Button size="sm" className="w-full bg-red-500 hover:bg-red-600">
                            <Plus className="h-3 w-3 mr-1" />
                            เพิ่มครู
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.nickname || teacher.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="room">ห้องเรียน *</Label>
                <Select
                  value={formData.roomId}
                  onValueChange={(value) => setFormData({ ...formData, roomId: value })}
                  disabled={!formData.branchId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.branchId ? "เลือกห้อง" : "เลือกสาขาก่อน"} />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.length === 0 ? (
                      <div className="p-2 text-center">
                        <p className="text-sm text-gray-500 mb-2">ยังไม่มีห้องในสาขานี้</p>
                        <Link href={`/branches/${formData.branchId}/rooms`}>
                          <Button size="sm" className="w-full bg-red-500 hover:bg-red-600">
                            <Plus className="h-3 w-3 mr-1" />
                            เพิ่มห้อง
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} (จุ {room.capacity} คน)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Room Availability Status */}
            {formData.roomId && (
              <div className="mt-4">
                {checkingAvailability ? (
                  <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      กำลังตรวจสอบห้องว่าง...
                    </AlertDescription>
                  </Alert>
                ) : roomAvailability.checked ? (
                  roomAvailability.available ? (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        ห้องเรียนว่างในช่วงเวลานี้
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <div className="space-y-2">
                          <p className="font-medium">ห้องเรียนไม่ว่างในช่วงเวลานี้</p>
                          {roomAvailability.conflicts && roomAvailability.conflicts.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-sm">ชนกับ:</p>
                              {roomAvailability.conflicts.map((conflict, index) => (
                                <div key={index} className="text-sm pl-4">
                                  • {conflict.type === 'class' && 'คลาส'} 
                                    {conflict.type === 'makeup' && 'Makeup Class'} 
                                    {conflict.type === 'trial' && 'ทดลองเรียน'}: {conflict.className}
                                  {conflict.classCode && ` (${conflict.classCode})`}
                                  {' '}เวลา {conflict.startTime}-{conflict.endTime} น.
                                  {conflict.date && ` วันที่ ${new Date(conflict.date).toLocaleDateString('th-TH')}`}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )
                ) : null}
              </div>
            )}

            {/* แสดง Alert เมื่อวันเริ่มต้นเป็นวันที่ผ่านมาแล้ว */}
            {autoStatus === 'started' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  เนื่องจากวันเริ่มต้นเป็นวันที่ผ่านมาแล้ว สถานะคลาสจะถูกกำหนดเป็น <strong>&quot;กำลังเรียน&quot;</strong> อัตโนมัติ
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Students & Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>จำนวนนักเรียนและราคา</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minStudents">นักเรียนขั้นต่ำ *</Label>
                <Input
                  id="minStudents"
                  type="number"
                  min="1"
                  value={formData.minStudents}
                  onChange={(e) => setFormData({ ...formData, minStudents: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxStudents">นักเรียนสูงสุด *</Label>
                <Input
                  id="maxStudents"
                  type="number"
                  min="1"
                  value={formData.maxStudents}
                  onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              {isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="enrolledCount">นักเรียนปัจจุบัน</Label>
                  <Input
                    id="enrolledCount"
                    type="number"
                    value={formData.enrolledCount}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalPrice">ราคาคลาสทั้งหมด (บาท) *</Label>
                <Input
                  id="totalPrice"
                  type="number"
                  min="0"
                  value={formData.pricing.totalPrice}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    pricing: { ...formData.pricing, totalPrice: parseInt(e.target.value) || 0 }
                  })}
                  placeholder="เช่น 15900"
                  required
                />
                <p className="text-xs text-gray-500">
                  ราคาต่อครั้ง: {formData.totalSessions > 0 ? Math.round(formData.pricing.totalPrice / formData.totalSessions).toLocaleString() : 0} บาท
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="materialFee">ค่าอุปกรณ์เพิ่มเติม (ถ้ามี)</Label>
                <Input
                  id="materialFee"
                  type="number"
                  min="0"
                  value={formData.pricing.materialFee}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    pricing: { ...formData.pricing, materialFee: parseInt(e.target.value) || 0 }
                  })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">ข้อมูลราคา:</p>
                  <p>ราคาคลาส: {formData.pricing.totalPrice.toLocaleString()} บาท / {formData.totalSessions} ครั้ง</p>
                  {formData.pricing.materialFee > 0 && (
                    <p>ค่าอุปกรณ์เพิ่มเติม: {formData.pricing.materialFee.toLocaleString()} บาท</p>
                  )}
                  <p className="mt-1 font-medium">
                    ราคาต่อครั้ง: {formData.totalSessions > 0 ? Math.round(formData.pricing.totalPrice / formData.totalSessions).toLocaleString() : 0} บาท
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>สถานะ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="status">สถานะคลาส</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as Class['status'] })}
                disabled={autoStatus === 'started'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {autoStatus !== 'started' && (
                    <>
                      <SelectItem value="draft">ร่าง</SelectItem>
                      <SelectItem value="published">เปิดรับสมัคร</SelectItem>
                    </>
                  )}
                  {(isEdit || autoStatus === 'started') && (
                    <>
                      <SelectItem value="started">กำลังเรียน</SelectItem>
                      {isEdit && (
                        <>
                          <SelectItem value="completed">จบแล้ว</SelectItem>
                          <SelectItem value="cancelled">ยกเลิก</SelectItem>
                        </>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
              {autoStatus === 'started' && (
                <p className="text-xs text-gray-500 mt-1">
                  สถานะถูกกำหนดอัตโนมัติเนื่องจากวันเริ่มต้นเป็นวันที่ผ่านมาแล้ว
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Link href="/classes">
            <Button type="button" variant="outline">
              <X className="h-4 w-4 mr-2" />
              ยกเลิก
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-red-500 hover:bg-red-600"
            disabled={loading || !roomAvailability.available}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEdit ? 'บันทึกการแก้ไข' : 'สร้างคลาส'}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}