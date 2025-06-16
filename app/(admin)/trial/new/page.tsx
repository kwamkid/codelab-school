// app/(admin)/trial/new/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TestTube, 
  ArrowLeft, 
  Save,
  Plus,
  Trash2,
  User,
  Phone,
  Mail,
  School,
  GraduationCap,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Subject } from '@/types/models';
import { getSubjects } from '@/lib/services/subjects';
import { createTrialBooking } from '@/lib/services/trial-bookings';

interface StudentForm {
  name: string;
  schoolName: string;
  gradeLevel: string;
  subjectInterests: string[];
}

export default function CreateTrialBookingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Form state
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [students, setStudents] = useState<StudentForm[]>([{
    name: '',
    schoolName: '',
    gradeLevel: '',
    subjectInterests: []
  }]);
  const [contactNote, setContactNote] = useState('');

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const data = await getSubjects();
      setSubjects(data.filter(s => s.isActive));
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast.error('ไม่สามารถโหลดข้อมูลวิชาได้');
    }
  };

  const addStudent = () => {
    setStudents([...students, {
      name: '',
      schoolName: '',
      gradeLevel: '',
      subjectInterests: []
    }]);
  };

  const removeStudent = (index: number) => {
    if (students.length > 1) {
      setStudents(students.filter((_, i) => i !== index));
    }
  };

  const updateStudent = (index: number, field: keyof StudentForm, value: any) => {
    const updated = [...students];
    updated[index] = { ...updated[index], [field]: value };
    setStudents(updated);
  };

  const toggleSubjectInterest = (studentIndex: number, subjectId: string) => {
    const updated = [...students];
    const interests = updated[studentIndex].subjectInterests;
    
    if (interests.includes(subjectId)) {
      updated[studentIndex].subjectInterests = interests.filter(id => id !== subjectId);
    } else {
      updated[studentIndex].subjectInterests = [...interests, subjectId];
    }
    
    setStudents(updated);
  };

  const validateForm = (): boolean => {
    if (!parentName.trim()) {
      toast.error('กรุณากรอกชื่อผู้ปกครอง');
      return false;
    }
    
    if (!parentPhone.trim()) {
      toast.error('กรุณากรอกเบอร์โทรศัพท์');
      return false;
    }
    
    // Validate phone format
    const phoneRegex = /^0[0-9]{8,9}$/;
    if (!phoneRegex.test(parentPhone.replace(/[-\s]/g, ''))) {
      toast.error('เบอร์โทรศัพท์ไม่ถูกต้อง');
      return false;
    }
    
    // Validate email if provided
    if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      toast.error('อีเมลไม่ถูกต้อง');
      return false;
    }
    
    // Validate students
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      if (!student.name.trim()) {
        toast.error(`กรุณากรอกชื่อนักเรียนคนที่ ${i + 1}`);
        return false;
      }
      if (student.subjectInterests.length === 0) {
        toast.error(`กรุณาเลือกวิชาที่สนใจสำหรับนักเรียนคนที่ ${i + 1}`);
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const bookingData: any = {
        source: 'walkin' as const,
        parentName: parentName.trim(),
        parentPhone: parentPhone.replace(/[-\s]/g, ''),
        students: students.map(s => ({
          name: s.name.trim(),
          subjectInterests: s.subjectInterests
        })),
        status: 'new' as const
      };
      
      // Add optional fields only if they have values
      if (parentEmail.trim()) {
        bookingData.parentEmail = parentEmail.trim();
      }
      
      if (contactNote.trim()) {
        bookingData.contactNote = contactNote.trim();
      }
      
      // Add optional student fields
      bookingData.students = students.map(s => {
        const studentData: any = {
          name: s.name.trim(),
          subjectInterests: s.subjectInterests
        };
        
        if (s.schoolName.trim()) {
          studentData.schoolName = s.schoolName.trim();
        }
        
        if (s.gradeLevel.trim()) {
          studentData.gradeLevel = s.gradeLevel.trim();
        }
        
        return studentData;
      });
      
      const bookingId = await createTrialBooking(bookingData);
      toast.success('บันทึกการจองทดลองเรียนสำเร็จ');
      router.push(`/trial/${bookingId}`);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          กลับ
        </Button>
        
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TestTube className="h-8 w-8 text-red-500" />
          เพิ่มการจองทดลองเรียน (Walk-in)
        </h1>
        <p className="text-gray-600 mt-2">บันทึกข้อมูลผู้ปกครองที่มา Walk-in เพื่อทดลองเรียน</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Parent Information */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลผู้ปกครอง</CardTitle>
            <CardDescription>กรอกข้อมูลติดต่อผู้ปกครอง</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parentName">
                  ชื่อผู้ปกครอง <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="parentName"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="ชื่อ-นามสกุล"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="parentPhone">
                  เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="parentPhone"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="08x-xxx-xxxx"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="parentEmail">อีเมล (ถ้ามี)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="parentEmail"
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>ข้อมูลนักเรียน</CardTitle>
                <CardDescription>กรอกข้อมูลนักเรียนที่ต้องการทดลองเรียน</CardDescription>
              </div>
              <Button
                type="button"
                onClick={addStudent}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มนักเรียน
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {students.map((student, idx) => (
              <div key={idx} className="relative p-4 border rounded-lg space-y-4">
                {students.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeStudent(idx)}
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                
                <div className="font-medium text-sm text-gray-600">
                  นักเรียนคนที่ {idx + 1}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      ชื่อนักเรียน <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={student.name}
                      onChange={(e) => updateStudent(idx, 'name', e.target.value)}
                      placeholder="ชื่อ-นามสกุล"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>โรงเรียน</Label>
                    <div className="relative">
                      <School className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={student.schoolName}
                        onChange={(e) => updateStudent(idx, 'schoolName', e.target.value)}
                        placeholder="ชื่อโรงเรียน"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label>ระดับชั้น</Label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={student.gradeLevel}
                        onChange={(e) => updateStudent(idx, 'gradeLevel', e.target.value)}
                        placeholder="เช่น ป.4, ม.2"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>
                    วิชาที่สนใจ <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {subjects.map((subject) => {
                      const isSelected = student.subjectInterests.includes(subject.id);
                      return (
                        <div
                          key={subject.id}
                          onClick={() => toggleSubjectInterest(idx, subject.id)}
                          className={`
                            p-3 rounded-lg border cursor-pointer transition-all
                            ${isSelected 
                              ? 'border-red-500 bg-red-50' 
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          <div className="font-medium text-sm">{subject.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {subject.category} • {subject.level}
                          </div>
                          {isSelected && (
                            <Badge className="mt-2 bg-red-100 text-red-700">
                              เลือกแล้ว
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>หมายเหตุ</CardTitle>
            <CardDescription>บันทึกข้อมูลเพิ่มเติม (ถ้ามี)</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={contactNote}
              onChange={(e) => setContactNote(e.target.value)}
              placeholder="เช่น ต้องการเรียนช่วงเย็นวันธรรมดา, มีข้อจำกัดด้านเวลา"
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            หลังจากบันทึกข้อมูลแล้ว คุณสามารถติดต่อผู้ปกครองและนัดหมายเวลาทดลองเรียนได้ในขั้นตอนถัดไป
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-red-500 hover:bg-red-600"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                บันทึกข้อมูล
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}