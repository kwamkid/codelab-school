// app/liff/register/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, User, UserPlus, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StudentForm {
  name: string;
  nickname: string;
  birthdate: string;
  gender: 'M' | 'F' | '';
  schoolName: string;
  gradeLevel: string;
  allergies?: string;
  specialNeeds?: string;
}

export default function LiffRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  
  const [parentData, setParentData] = useState({
    phone: '',
    email: '',
    emergencyPhone: '',
    preferredBranchId: ''
  });
  
  const [students, setStudents] = useState<StudentForm[]>([{
    name: '',
    nickname: '',
    birthdate: '',
    gender: '',
    schoolName: '',
    gradeLevel: '',
    allergies: '',
    specialNeeds: ''
  }]);

  useEffect(() => {
    checkRegistration();
  }, []);

  const checkRegistration = async () => {
    try {
      // Get LINE profile
      const profileStr = sessionStorage.getItem('lineProfile');
      if (!profileStr) {
        toast.error('กรุณา Login ผ่าน LINE');
        return;
      }
      
      const lineProfile = JSON.parse(profileStr);
      setProfile(lineProfile);
      
      // TODO: Check if already registered
      // const response = await fetch(`/api/parents/check?lineUserId=${lineProfile.userId}`);
      // const data = await response.json();
      // if (data.isRegistered) {
      //   setIsRegistered(true);
      //   router.push('/liff/schedule');
      // }
    } catch (error) {
      console.error('Error checking registration:', error);
    }
  };

  const addStudent = () => {
    setStudents([...students, {
      name: '',
      nickname: '',
      birthdate: '',
      gender: '',
      schoolName: '',
      gradeLevel: '',
      allergies: '',
      specialNeeds: ''
    }]);
  };

  const removeStudent = (index: number) => {
    if (students.length > 1) {
      setStudents(students.filter((_, i) => i !== index));
    }
  };

  const updateStudent = (index: number, field: keyof StudentForm, value: string) => {
    const updated = [...students];
    updated[index] = { ...updated[index], [field]: value };
    setStudents(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate parent data
    if (!parentData.phone || !parentData.preferredBranchId) {
      toast.error('กรุณากรอกข้อมูลผู้ปกครองให้ครบถ้วน');
      return;
    }
    
    // Validate students
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      if (!student.name || !student.nickname || !student.birthdate || !student.gender) {
        toast.error(`กรุณากรอกข้อมูลนักเรียนคนที่ ${i + 1} ให้ครบถ้วน`);
        return;
      }
    }
    
    setLoading(true);
    
    try {
      // TODO: Call API to register
      const response = await fetch('/api/parents/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lineUserId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          ...parentData,
          students
        })
      });
      
      if (response.ok) {
        toast.success('ลงทะเบียนสำเร็จ!');
        router.push('/liff/schedule');
      } else {
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  if (isRegistered) {
    return (
      <div className="text-center py-8">
        <p>คุณลงทะเบียนแล้ว กำลังไปหน้าตารางเรียน...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <Card>
        <CardHeader>
          <CardTitle>ลงทะเบียนผู้ปกครอง</CardTitle>
          <CardDescription>
            กรุณากรอกข้อมูลผู้ปกครองและนักเรียน
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Parent Information */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <User className="h-5 w-5" />
                ข้อมูลผู้ปกครอง
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="h-4 w-4 inline mr-1" />
                    เบอร์โทรศัพท์ *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={parentData.phone}
                    onChange={(e) => setParentData({...parentData, phone: e.target.value})}
                    placeholder="08x-xxx-xxxx"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="h-4 w-4 inline mr-1" />
                    อีเมล
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={parentData.email}
                    onChange={(e) => setParentData({...parentData, email: e.target.value})}
                    placeholder="email@example.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">เบอร์ฉุกเฉิน</Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    value={parentData.emergencyPhone}
                    onChange={(e) => setParentData({...parentData, emergencyPhone: e.target.value})}
                    placeholder="08x-xxx-xxxx"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>สาขาที่สะดวก *</Label>
                  <Select
                    value={parentData.preferredBranchId}
                    onValueChange={(value) => setParentData({...parentData, preferredBranchId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสาขา" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sukhumvit">สาขาสุขุมวิท</SelectItem>
                      <SelectItem value="siam">สาขาสยาม</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Students Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  ข้อมูลนักเรียน
                </h3>
                <Button
                  type="button"
                  onClick={addStudent}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  เพิ่มนักเรียน
                </Button>
              </div>
              
              {students.map((student, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">นักเรียนคนที่ {index + 1}</h4>
                      {students.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeStudent(index)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>ชื่อ-นามสกุล *</Label>
                        <Input
                          value={student.name}
                          onChange={(e) => updateStudent(index, 'name', e.target.value)}
                          placeholder="ด.ช. ธนกร วิชัยดิษฐ"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>ชื่อเล่น *</Label>
                        <Input
                          value={student.nickname}
                          onChange={(e) => updateStudent(index, 'nickname', e.target.value)}
                          placeholder="น้องบอส"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>วันเกิด *</Label>
                        <Input
                          type="date"
                          value={student.birthdate}
                          onChange={(e) => updateStudent(index, 'birthdate', e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>เพศ *</Label>
                        <Select
                          value={student.gender}
                          onValueChange={(value) => updateStudent(index, 'gender', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกเพศ" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">ชาย</SelectItem>
                            <SelectItem value="F">หญิง</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>โรงเรียน</Label>
                        <Input
                          value={student.schoolName}
                          onChange={(e) => updateStudent(index, 'schoolName', e.target.value)}
                          placeholder="โรงเรียนสาธิต"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>ระดับชั้น</Label>
                        <Input
                          value={student.gradeLevel}
                          onChange={(e) => updateStudent(index, 'gradeLevel', e.target.value)}
                          placeholder="ป.3"
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <Label>ข้อมูลการแพ้อาหาร/ยา</Label>
                        <Input
                          value={student.allergies}
                          onChange={(e) => updateStudent(index, 'allergies', e.target.value)}
                          placeholder="แพ้นม, แพ้ถั่ว"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-red-500 hover:bg-red-600"
              disabled={loading}
            >
              {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}