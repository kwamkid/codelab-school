'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/liff/liff-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GradeLevelCombobox } from "@/components/ui/grade-level-combobox";
import { Loader2, ChevronRight, User, Phone, Mail, MapPin, Plus, X } from 'lucide-react';
import { createParent, createStudent } from '@/lib/services/parents';
import { toast } from 'sonner';
import { getActiveBranches } from '@/lib/services/branches';
import { Branch } from '@/types/models';

interface StudentFormData {
  name: string;
  nickname: string;
  birthdate: string;
  gender: 'M' | 'F';
  schoolName: string;
  gradeLevel: string;
  allergies: string;
  specialNeeds: string;
}

export default function LiffRegisterPage() {
  const router = useRouter();
  const { profile } = useLiff();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Parent data
  const [parentData, setParentData] = useState({
    displayName: profile?.displayName || '',
    phone: '',
    emergencyPhone: '',
    email: '',
    preferredBranchId: '',
    address: {
      houseNumber: '',
      street: '',
      subDistrict: '',
      district: '',
      province: '',
      postalCode: '',
    }
  });

  // Students data
  const [students, setStudents] = useState<StudentFormData[]>([{
    name: '',
    nickname: '',
    birthdate: '',
    gender: 'M' as const,
    schoolName: '',
    gradeLevel: '',
    allergies: '',
    specialNeeds: '',
  }]);

  // Load branches
  useState(() => {
    getActiveBranches().then(setBranches).catch(console.error);
  });

  const handleParentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!parentData.phone || parentData.phone.length < 9) {
      toast.error('กรุณากรอกเบอร์โทรให้ถูกต้อง');
      return;
    }

    // Go to student step
    setCurrentStep(2);
  };

  const handleAddStudent = () => {
    setStudents([...students, {
      name: '',
      nickname: '',
      birthdate: '',
      gender: 'M',
      schoolName: '',
      gradeLevel: '',
      allergies: '',
      specialNeeds: '',
    }]);
  };

  const handleRemoveStudent = (index: number) => {
    if (students.length > 1) {
      setStudents(students.filter((_, i) => i !== index));
    }
  };

  const handleStudentChange = (index: number, field: keyof StudentFormData, value: string) => {
    const updatedStudents = [...students];
    updatedStudents[index] = {
      ...updatedStudents[index],
      [field]: value
    };
    setStudents(updatedStudents);
  };

  const handleFinalSubmit = async () => {
  // Validate at least one student
  const validStudents = students.filter(s => s.name && s.birthdate);
  if (validStudents.length === 0) {
    toast.error('กรุณากรอกข้อมูลนักเรียนอย่างน้อย 1 คน');
    return;
  }

  setLoading(true);
  
  try {
    // Check if LINE ID already used
    if (profile?.userId) {
      const { checkLineUserIdExists } = await import('@/lib/services/parents');
      const lineCheck = await checkLineUserIdExists(profile.userId);
      
      if (lineCheck.exists) {
        toast.error('LINE account นี้ถูกใช้งานแล้ว');
        setLoading(false);
        return;
      }
    }

    // Create parent
    const parentId = await createParent({
      ...parentData,
      lineUserId: profile?.userId || '',
      pictureUrl: profile?.pictureUrl,
    });

    // Create students
    for (const student of validStudents) {
      await createStudent(parentId, {
        ...student,
        birthdate: new Date(student.birthdate),
        isActive: true,
      });
    }

    toast.success('ลงทะเบียนสำเร็จ! กรุณารอเจ้าหน้าที่ติดต่อกลับ');
    
    // Redirect to profile
    router.push('/liff/profile');
  } catch (error) {
    console.error('Registration error:', error);
    toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="flex">
          <div className={`flex-1 h-1 ${currentStep >= 1 ? 'bg-red-500' : 'bg-gray-200'}`} />
          <div className={`flex-1 h-1 ${currentStep >= 2 ? 'bg-red-500' : 'bg-gray-200'}`} />
          <div className={`flex-1 h-1 ${currentStep >= 3 ? 'bg-red-500' : 'bg-gray-200'}`} />
        </div>
      </div>

      {/* Header */}
      <div className="bg-white p-4 border-b">
        <h1 className="text-xl font-bold text-gray-900">ลงทะเบียนผู้ปกครอง</h1>
        <p className="text-sm text-gray-600 mt-1">
          ขั้นตอนที่ {currentStep} จาก 3
        </p>
      </div>

      {/* Step 1: Parent Info */}
      {currentStep === 1 && (
        <form onSubmit={handleParentSubmit} className="p-4 space-y-4">
          <div className="bg-white rounded-lg p-4 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-gray-400" />
              ข้อมูลผู้ปกครอง
            </h2>
            
            <div className="space-y-3">
              <div>
                <Label>ชื่อ-นามสกุล</Label>
                <Input
                  value={parentData.displayName}
                  onChange={(e) => setParentData({...parentData, displayName: e.target.value})}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>เบอร์โทรหลัก *</Label>
                  <Input
                    type="tel"
                    placeholder="08x-xxx-xxxx"
                    value={parentData.phone}
                    onChange={(e) => setParentData({...parentData, phone: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>เบอร์ฉุกเฉิน</Label>
                  <Input
                    type="tel"
                    placeholder="08x-xxx-xxxx"
                    value={parentData.emergencyPhone}
                    onChange={(e) => setParentData({...parentData, emergencyPhone: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label>อีเมล</Label>
                <Input
                  type="email"
                  value={parentData.email}
                  onChange={(e) => setParentData({...parentData, email: e.target.value})}
                />
              </div>
              
              <div>
                <Label>สาขาที่สะดวก</Label>
                <Select
                  value={parentData.preferredBranchId}
                  onValueChange={(value) => setParentData({...parentData, preferredBranchId: value})}
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
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-400" />
              ที่อยู่ (ไม่บังคับ)
            </h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>บ้านเลขที่</Label>
                  <Input
                    value={parentData.address.houseNumber}
                    onChange={(e) => setParentData({
                      ...parentData,
                      address: {...parentData.address, houseNumber: e.target.value}
                    })}
                  />
                </div>
                <div>
                  <Label>ถนน</Label>
                  <Input
                    value={parentData.address.street}
                    onChange={(e) => setParentData({
                      ...parentData,
                      address: {...parentData.address, street: e.target.value}
                    })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>แขวง/ตำบล</Label>
                  <Input
                    value={parentData.address.subDistrict}
                    onChange={(e) => setParentData({
                      ...parentData,
                      address: {...parentData.address, subDistrict: e.target.value}
                    })}
                  />
                </div>
                <div>
                  <Label>เขต/อำเภอ</Label>
                  <Input
                    value={parentData.address.district}
                    onChange={(e) => setParentData({
                      ...parentData,
                      address: {...parentData.address, district: e.target.value}
                    })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>จังหวัด</Label>
                  <Input
                    value={parentData.address.province}
                    onChange={(e) => setParentData({
                      ...parentData,
                      address: {...parentData.address, province: e.target.value}
                    })}
                  />
                </div>
                <div>
                  <Label>รหัสไปรษณีย์</Label>
                  <Input
                    maxLength={5}
                    value={parentData.address.postalCode}
                    onChange={(e) => setParentData({
                      ...parentData,
                      address: {...parentData.address, postalCode: e.target.value}
                    })}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full bg-red-500 hover:bg-red-600">
            ถัดไป
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </form>
      )}

      {/* Step 2: Student Info */}
      {currentStep === 2 && (
        <div className="p-4 space-y-4">
          <div className="space-y-4">
            {students.map((student, index) => (
              <div key={index} className="bg-white rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">นักเรียนคนที่ {index + 1}</h3>
                  {students.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveStudent(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>ชื่อ-นามสกุล *</Label>
                      <Input
                        value={student.name}
                        onChange={(e) => handleStudentChange(index, 'name', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>ชื่อเล่น *</Label>
                      <Input
                        value={student.nickname}
                        onChange={(e) => handleStudentChange(index, 'nickname', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>วันเกิด *</Label>
                      <Input
                        type="date"
                        value={student.birthdate}
                        onChange={(e) => handleStudentChange(index, 'birthdate', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>เพศ *</Label>
                      <Select
                        value={student.gender}
                        onValueChange={(value) => handleStudentChange(index, 'gender', value as 'M' | 'F')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">ชาย</SelectItem>
                          <SelectItem value="F">หญิง</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>โรงเรียน</Label>
                      <Input
                        value={student.schoolName}
                        onChange={(e) => handleStudentChange(index, 'schoolName', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>ระดับชั้น</Label>
                      <GradeLevelCombobox
                        value={student.gradeLevel}
                        onChange={(value) => handleStudentChange(index, 'gradeLevel', value)}
                        placeholder="เลือกระดับชั้น..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        เริ่มพิมพ์เพื่อค้นหา เช่น "ป", "ประถม", "Grade"
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <Label>ประวัติการแพ้อาหาร/ยา</Label>
                    <Textarea
                      rows={2}
                      value={student.allergies}
                      onChange={(e) => handleStudentChange(index, 'allergies', e.target.value)}
                      placeholder="ระบุอาหารหรือยาที่แพ้ (ถ้ามี)"
                    />
                  </div>
                  
                  <div>
                    <Label>ความต้องการพิเศษ</Label>
                    <Textarea
                      rows={2}
                      value={student.specialNeeds}
                      onChange={(e) => handleStudentChange(index, 'specialNeeds', e.target.value)}
                      placeholder="ระบุความต้องการพิเศษ (ถ้ามี)"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleAddStudent}
          >
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มนักเรียน
          </Button>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setCurrentStep(1)}
            >
              ย้อนกลับ
            </Button>
            <Button
              type="button"
              className="flex-1 bg-red-500 hover:bg-red-600"
              onClick={() => {
                const validStudents = students.filter(s => s.name && s.birthdate);
                if (validStudents.length === 0) {
                  toast.error('กรุณากรอกข้อมูลนักเรียนอย่างน้อย 1 คน');
                  return;
                }
                setCurrentStep(3);
              }}
            >
              ถัดไป
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Summary */}
      {currentStep === 3 && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-lg p-4">
            <h2 className="font-semibold mb-4">สรุปข้อมูล</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">ข้อมูลผู้ปกครอง</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-600">ชื่อ:</span> {parentData.displayName}</p>
                  <p><span className="text-gray-600">เบอร์โทร:</span> {parentData.phone}</p>
                  {parentData.email && (
                    <p><span className="text-gray-600">อีเมล:</span> {parentData.email}</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  ข้อมูลนักเรียน ({students.filter(s => s.name).length} คน)
                </h3>
                <div className="space-y-2">
                  {students.filter(s => s.name).map((student, index) => (
                    <div key={index} className="bg-gray-50 rounded p-3 text-sm">
                      <p className="font-medium">{student.nickname || student.name}</p>
                      <p className="text-gray-600">
                        {student.name} • {student.gender === 'M' ? 'ชาย' : 'หญิง'}
                      </p>
                      {student.allergies && (
                        <p className="text-red-600 text-xs mt-1">⚠️ แพ้: {student.allergies}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>หมายเหตุ:</strong> หลังจากลงทะเบียนเสร็จสิ้น 
              เจ้าหน้าที่จะติดต่อกลับภายใน 1-2 วันทำการ 
              เพื่อแนะนำคอร์สเรียนที่เหมาะสม
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setCurrentStep(2)}
              disabled={loading}
            >
              ย้อนกลับ
            </Button>
            <Button
              className="flex-1 bg-red-500 hover:bg-red-600"
              onClick={handleFinalSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  ยืนยันการลงทะเบียน
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}