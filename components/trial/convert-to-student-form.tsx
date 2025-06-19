// components/trial/convert-to-student-form.tsx

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  User,
  GraduationCap,
  Calendar,
  DollarSign,
  Tag,
  Info,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Baby,
  School,
  Heart,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import { TrialBooking, TrialSession, Class, Subject } from '@/types/models';
import { convertTrialToEnrollment } from '@/lib/services/trial-bookings';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { formatCurrency, calculateAge } from '@/lib/utils';
import { GradeLevelCombobox } from '@/components/ui/grade-level-combobox';

interface ConvertToStudentFormProps {
  booking: TrialBooking;
  session: TrialSession;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  // Parent info (เพิ่มข้อมูลพื้นฐานที่แก้ไขได้)
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  emergencyPhone: string;
  address: {
    houseNumber: string;
    street: string;
    subDistrict: string;
    district: string;
    province: string;
    postalCode: string;
  };
  
  // Student additional info
  studentName: string; // เพิ่ม field ให้แก้ไขชื่อนักเรียนได้
  studentNickname: string;
  studentBirthdate: string;
  studentGender: 'M' | 'F';
  studentSchoolName: string;
  studentGradeLevel: string;
  studentAllergies: string;
  studentSpecialNeeds: string;
  emergencyContact: string;
  emergencyContactPhone: string;
  
  // Class selection
  selectedClass: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  promotionCode: string;
}

const steps = [
  { id: 1, name: 'ข้อมูลผู้ปกครอง', icon: User },
  { id: 2, name: 'ข้อมูลนักเรียน', icon: Baby },
  { id: 3, name: 'เลือกคลาสและราคา', icon: DollarSign },
];

export default function ConvertToStudentForm({
  booking,
  session,
  onSuccess,
  onCancel
}: ConvertToStudentFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Form state - initialize with booking data
  const [formData, setFormData] = useState<FormData>({
    // Parent (สามารถแก้ไขข้อมูลพื้นฐานได้)
    parentName: booking.parentName,
    parentPhone: booking.parentPhone,
    parentEmail: booking.parentEmail || '',
    emergencyPhone: '',
    address: {
      houseNumber: '',
      street: '',
      subDistrict: '',
      district: '',
      province: '',
      postalCode: ''
    },
    
    // Student - เพิ่มการ initialize ชื่อนักเรียน
    studentName: session.studentName, // เพิ่มการใส่ชื่อจาก session
    studentNickname: '',
    studentBirthdate: '',
    studentGender: 'M',
    studentSchoolName: '',
    studentGradeLevel: '',
    studentAllergies: '',
    studentSpecialNeeds: '',
    emergencyContact: '',
    emergencyContactPhone: '',
    
    // Class
    selectedClass: '',
    discount: 5, // Default 5% for trial conversion
    discountType: 'percentage',
    promotionCode: 'TRIAL5'
  });
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Pricing calculation
  const [pricing, setPricing] = useState({
    originalPrice: 0,
    discountAmount: 0,
    finalPrice: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculatePricing();
  }, [formData.selectedClass, formData.discount, formData.discountType]);

  const loadData = async () => {
    try {
      setLoadingClasses(true);
      const [classesData, subjectsData] = await Promise.all([
        getClasses(),
        getSubjects()
      ]);
      
      setSubjects(subjectsData);
      
      // Filter classes for the same subject and branch
      const eligibleClasses = classesData.filter(cls => 
        cls.subjectId === session.subjectId &&
        cls.branchId === session.branchId &&
        (cls.status === 'published' || cls.status === 'started') &&
        cls.enrolledCount < cls.maxStudents
      );
      
      setClasses(eligibleClasses);
      
      // Auto-select if only one class available
      if (eligibleClasses.length === 1) {
        setFormData(prev => ({ ...prev, selectedClass: eligibleClasses[0].id }));
      }
      
      // Pre-fill student data if available
      const studentData = booking.students.find(s => s.name === session.studentName);
      if (studentData) {
        setFormData(prev => ({
          ...prev,
          studentSchoolName: studentData.schoolName || '',
          studentGradeLevel: studentData.gradeLevel || ''
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลคลาสได้');
    } finally {
      setLoadingClasses(false);
    }
  };

  const calculatePricing = () => {
    if (!formData.selectedClass) {
      setPricing({ originalPrice: 0, discountAmount: 0, finalPrice: 0 });
      return;
    }

    const selectedClassData = classes.find(c => c.id === formData.selectedClass);
    if (!selectedClassData) return;

    const original = selectedClassData.pricing.totalPrice;
    let discountAmount = 0;

    if (formData.discountType === 'percentage') {
      discountAmount = (original * formData.discount) / 100;
    } else {
      discountAmount = formData.discount;
    }

    const final = Math.max(0, original - discountAmount);

    setPricing({
      originalPrice: original,
      discountAmount,
      finalPrice: final
    });
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 1: // Parent info
        if (!formData.parentName.trim()) {
          newErrors.parentName = 'กรุณากรอกชื่อผู้ปกครอง';
        }
        
        if (!formData.parentPhone.trim()) {
          newErrors.parentPhone = 'กรุณากรอกเบอร์โทรศัพท์';
        } else if (!/^0[0-9]{8,9}$/.test(formData.parentPhone.replace(/-/g, ''))) {
          newErrors.parentPhone = 'เบอร์โทรไม่ถูกต้อง';
        }
        
        // เบอร์ฉุกเฉินไม่บังคับ แต่ถ้ากรอกต้องถูกต้อง
        if (formData.emergencyPhone && !/^0[0-9]{8,9}$/.test(formData.emergencyPhone.replace(/-/g, ''))) {
          newErrors.emergencyPhone = 'เบอร์โทรฉุกเฉินไม่ถูกต้อง';
        }
        
        if (formData.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) {
          newErrors.parentEmail = 'อีเมลไม่ถูกต้อง';
        }
        
        // Check if at least partial address is provided
        const hasAddressData = Object.values(formData.address).some(v => v.trim() !== '');
        if (hasAddressData) {
          if (!formData.address.houseNumber) newErrors['address.houseNumber'] = 'กรุณากรอกบ้านเลขที่';
          if (!formData.address.subDistrict) newErrors['address.subDistrict'] = 'กรุณากรอกแขวง/ตำบล';
          if (!formData.address.district) newErrors['address.district'] = 'กรุณากรอกเขต/อำเภอ';
          if (!formData.address.province) newErrors['address.province'] = 'กรุณากรอกจังหวัด';
        }
        break;
        
      case 2: // Student info
        if (!formData.studentName.trim()) {
          newErrors.studentName = 'กรุณากรอกชื่อ-นามสกุลนักเรียน';
        }
        
        if (!formData.studentNickname.trim()) {
          newErrors.studentNickname = 'กรุณากรอกชื่อเล่น';
        }
        
        if (!formData.studentBirthdate) {
          newErrors.studentBirthdate = 'กรุณาเลือกวันเกิด';
        } else {
          const age = calculateAge(new Date(formData.studentBirthdate));
          if (age < 4 || age > 18) {
            newErrors.studentBirthdate = 'นักเรียนต้องมีอายุระหว่าง 4-18 ปี';
          }
        }
        
        if (!formData.studentGender) {
          newErrors.studentGender = 'กรุณาเลือกเพศ';
        }
        
        if (formData.emergencyContactPhone && 
            !/^0[0-9]{8,9}$/.test(formData.emergencyContactPhone.replace(/-/g, ''))) {
          newErrors.emergencyContactPhone = 'เบอร์โทรไม่ถูกต้อง';
        }
        break;
        
      case 3: // Class selection
        if (!formData.selectedClass) {
          newErrors.selectedClass = 'กรุณาเลือกคลาส';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(currentStep)) return;

    setLoading(true);

    try {
      // Prepare conversion data
      const conversionData = {
        // Parent info
        parentName: formData.parentName,
        parentPhone: formData.parentPhone.replace(/-/g, ''),
        parentEmail: formData.parentEmail || undefined,
        emergencyPhone: formData.emergencyPhone ? formData.emergencyPhone.replace(/-/g, '') : undefined,
        address: formData.address.houseNumber ? formData.address : undefined,
        
        // Student info - ใช้ชื่อที่แก้ไขแล้ว
        studentName: formData.studentName,
        studentNickname: formData.studentNickname,
        studentBirthdate: new Date(formData.studentBirthdate),
        studentGender: formData.studentGender,
        studentSchoolName: formData.studentSchoolName || undefined,
        studentGradeLevel: formData.studentGradeLevel || undefined,
        studentAllergies: formData.studentAllergies || undefined,
        studentSpecialNeeds: formData.studentSpecialNeeds || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        emergencyContactPhone: formData.emergencyContactPhone || undefined,
        
        // Class and pricing
        classId: formData.selectedClass,
        pricing: {
          originalPrice: pricing.originalPrice,
          discount: pricing.discountAmount,
          discountType: formData.discountType,
          finalPrice: pricing.finalPrice,
          promotionCode: formData.promotionCode || undefined
        }
      };
      
      // Call enhanced conversion function
      const result = await convertTrialToEnrollment(
        booking.id,
        session.id,
        conversionData
      );

      toast.success('แปลงเป็นนักเรียนสำเร็จ');
      onSuccess();
    } catch (error: any) {
      console.error('Error converting to student:', error);
      if (error.message?.includes('เบอร์โทรหลักนี้มีอยู่ในระบบแล้ว')) {
        toast.error('เบอร์โทรนี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบข้อมูล');
      } else if (error.message?.includes('เบอร์โทรฉุกเฉินนี้มีอยู่ในระบบแล้ว')) {
        toast.error('เบอร์โทรฉุกเฉินนี้มีอยู่ในระบบแล้ว กรุณาใช้เบอร์อื่น');
      } else {
        toast.error('เกิดข้อผิดพลาดในการแปลงเป็นนักเรียน');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStudentData = () => {
    return booking.students.find(s => s.name === session.studentName);
  };

  const studentData = getStudentData();
  const subject = subjects.find(s => s.id === session.subjectId);

  if (loadingClasses) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>ขั้นตอนที่ {currentStep} จาก {steps.length}</span>
          <span>{steps[currentStep - 1].name}</span>
        </div>
        <Progress value={(currentStep / steps.length) * 100} className="h-2" />
      </div>

      {/* Step 1: Parent Information */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลผู้ปกครอง</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic parent info - Editable */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  ข้อมูลพื้นฐาน (แก้ไขได้)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parentName">
                      <User className="inline h-4 w-4 mr-1" />
                      ชื่อผู้ปกครอง <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="parentName"
                      value={formData.parentName}
                      onChange={(e) => setFormData(prev => ({ ...prev, parentName: e.target.value }))}
                      placeholder="ชื่อ-นามสกุล"
                      className={errors.parentName ? 'border-red-500' : ''}
                      required
                    />
                    {errors.parentName && (
                      <p className="text-sm text-red-500">{errors.parentName}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="parentPhone">
                      <Phone className="inline h-4 w-4 mr-1" />
                      เบอร์โทร <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="parentPhone"
                      value={formData.parentPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, parentPhone: e.target.value }))}
                      placeholder="08x-xxx-xxxx"
                      className={errors.parentPhone ? 'border-red-500' : ''}
                      required
                    />
                    {errors.parentPhone && (
                      <p className="text-sm text-red-500">{errors.parentPhone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional parent info */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm">ข้อมูลเพิ่มเติม</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parentEmail">
                      <Mail className="inline h-4 w-4 mr-1" />
                      อีเมล
                    </Label>
                    <Input
                      id="parentEmail"
                      type="email"
                      value={formData.parentEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, parentEmail: e.target.value }))}
                      placeholder="parent@example.com"
                      className={errors.parentEmail ? 'border-red-500' : ''}
                    />
                    {errors.parentEmail && (
                      <p className="text-sm text-red-500">{errors.parentEmail}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">
                      <Phone className="inline h-4 w-4 mr-1" />
                      เบอร์โทรฉุกเฉิน
                    </Label>
                    <Input
                      id="emergencyPhone"
                      value={formData.emergencyPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                      placeholder="08x-xxx-xxxx (ไม่บังคับ)"
                      className={errors.emergencyPhone ? 'border-red-500' : ''}
                    />
                    {errors.emergencyPhone && (
                      <p className="text-sm text-red-500">{errors.emergencyPhone}</p>
                    )}
                    <p className="text-xs text-gray-500">กรณีติดต่อเบอร์หลักไม่ได้</p>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    ที่อยู่ (ถ้ามี)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="houseNumber">บ้านเลขที่</Label>
                      <Input
                        id="houseNumber"
                        value={formData.address.houseNumber}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          address: { ...prev.address, houseNumber: e.target.value }
                        }))}
                        placeholder="123/45"
                        className={errors['address.houseNumber'] ? 'border-red-500' : ''}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="street">ถนน</Label>
                      <Input
                        id="street"
                        value={formData.address.street}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          address: { ...prev.address, street: e.target.value }
                        }))}
                        placeholder="ถนนสุขุมวิท"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subDistrict">แขวง/ตำบล</Label>
                      <Input
                        id="subDistrict"
                        value={formData.address.subDistrict}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          address: { ...prev.address, subDistrict: e.target.value }
                        }))}
                        placeholder="คลองเตย"
                        className={errors['address.subDistrict'] ? 'border-red-500' : ''}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="district">เขต/อำเภอ</Label>
                      <Input
                        id="district"
                        value={formData.address.district}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          address: { ...prev.address, district: e.target.value }
                        }))}
                        placeholder="คลองเตย"
                        className={errors['address.district'] ? 'border-red-500' : ''}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="province">จังหวัด</Label>
                      <Input
                        id="province"
                        value={formData.address.province}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          address: { ...prev.address, province: e.target.value }
                        }))}
                        placeholder="กรุงเทพมหานคร"
                        className={errors['address.province'] ? 'border-red-500' : ''}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">รหัสไปรษณีย์</Label>
                      <Input
                        id="postalCode"
                        maxLength={5}
                        value={formData.address.postalCode}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          address: { ...prev.address, postalCode: e.target.value }
                        }))}
                        placeholder="10110"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Student Information */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลนักเรียน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Student name - now editable */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  ข้อมูลพื้นฐาน
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentName">
                      ชื่อ-นามสกุล <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="studentName"
                      value={formData.studentName}
                      onChange={(e) => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
                      placeholder="ชื่อ-นามสกุลนักเรียน"
                      className={errors.studentName ? 'border-red-500' : ''}
                      required
                    />
                    {errors.studentName && (
                      <p className="text-sm text-red-500">{errors.studentName}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="studentNickname">
                      ชื่อเล่น <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="studentNickname"
                      value={formData.studentNickname}
                      onChange={(e) => setFormData(prev => ({ ...prev, studentNickname: e.target.value }))}
                      placeholder="ชื่อเล่น"
                      className={errors.studentNickname ? 'border-red-500' : ''}
                      required
                    />
                    {errors.studentNickname && (
                      <p className="text-sm text-red-500">{errors.studentNickname}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="studentGender">
                      เพศ <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={formData.studentGender}
                      onValueChange={(value: 'M' | 'F') => setFormData(prev => ({ ...prev, studentGender: value }))}
                    >
                      <SelectTrigger className={errors.studentGender ? 'border-red-500' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">ชาย</SelectItem>
                        <SelectItem value="F">หญิง</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="studentBirthdate">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      วันเกิด <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="studentBirthdate"
                      type="date"
                      value={formData.studentBirthdate}
                      onChange={(e) => setFormData(prev => ({ ...prev, studentBirthdate: e.target.value }))}
                      className={errors.studentBirthdate ? 'border-red-500' : ''}
                      required
                    />
                    {errors.studentBirthdate && (
                      <p className="text-sm text-red-500">{errors.studentBirthdate}</p>
                    )}
                    {formData.studentBirthdate && (
                      <p className="text-xs text-gray-500">
                        อายุ: {calculateAge(new Date(formData.studentBirthdate))} ปี
                      </p>
                    )}
                  </div>
                </div>

                {/* School Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentSchoolName">
                      <School className="inline h-4 w-4 mr-1" />
                      โรงเรียน
                    </Label>
                    <Input
                      id="studentSchoolName"
                      value={formData.studentSchoolName}
                      onChange={(e) => setFormData(prev => ({ ...prev, studentSchoolName: e.target.value }))}
                      placeholder="ชื่อโรงเรียน"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="studentGradeLevel">
                      <GraduationCap className="inline h-4 w-4 mr-1" />
                      ระดับชั้น
                    </Label>
                    <GradeLevelCombobox
                      value={formData.studentGradeLevel}
                      onChange={(value) => setFormData(prev => ({ ...prev, studentGradeLevel: value }))}
                      placeholder="พิมพ์ระดับชั้น เช่น ป.4, Grade 3..."
                    />
                  </div>
                </div>

                {/* Health & Special Needs */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    ข้อมูลสุขภาพและความต้องการพิเศษ
                  </h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="studentAllergies">
                      <AlertCircle className="inline h-4 w-4 mr-1 text-red-500" />
                      ข้อมูลการแพ้อาหาร/ยา
                    </Label>
                    <Textarea
                      id="studentAllergies"
                      value={formData.studentAllergies}
                      onChange={(e) => setFormData(prev => ({ ...prev, studentAllergies: e.target.value }))}
                      placeholder="ระบุอาหารหรือยาที่แพ้ (ถ้ามี)"
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="studentSpecialNeeds">ความต้องการพิเศษ</Label>
                    <Textarea
                      id="studentSpecialNeeds"
                      value={formData.studentSpecialNeeds}
                      onChange={(e) => setFormData(prev => ({ ...prev, studentSpecialNeeds: e.target.value }))}
                      placeholder="ระบุความต้องการพิเศษ (ถ้ามี)"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">ผู้ติดต่อฉุกเฉิน (นอกจากผู้ปกครอง)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact">ชื่อผู้ติดต่อฉุกเฉิน</Label>
                      <Input
                        id="emergencyContact"
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                        placeholder="ชื่อ-นามสกุล"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactPhone">เบอร์โทรฉุกเฉิน</Label>
                      <Input
                        id="emergencyContactPhone"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                        placeholder="08x-xxx-xxxx"
                        className={errors.emergencyContactPhone ? 'border-red-500' : ''}
                      />
                      {errors.emergencyContactPhone && (
                        <p className="text-sm text-red-500">{errors.emergencyContactPhone}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Class Selection & Pricing */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Class Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">เลือกคลาสที่จะลงทะเบียน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {classes.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ไม่พบคลาส {subject?.name} ที่เปิดรับสมัครในสาขานี้
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {classes.map((cls) => {
                    const isSelected = formData.selectedClass === cls.id;
                    const availableSeats = cls.maxStudents - cls.enrolledCount;
                    
                    return (
                      <div
                        key={cls.id}
                        onClick={() => setFormData(prev => ({ ...prev, selectedClass: cls.id }))}
                        className={`
                          p-4 rounded-lg border cursor-pointer transition-all
                          ${isSelected 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{cls.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {cls.code} • {cls.totalSessions} ครั้ง
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {cls.daysOfWeek.map(d => ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][d]).join(', ')}
                              </span>
                              <span>{cls.startTime} - {cls.endTime}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(cls.pricing.totalPrice)}</p>
                            <Badge 
                              variant={availableSeats <= 3 ? 'destructive' : 'outline'}
                              className="mt-1"
                            >
                              เหลือ {availableSeats} ที่
                            </Badge>
                          </div>
                        </div>
                        {isSelected && (
                          <Badge className="mt-3 bg-red-100 text-red-700">
                            เลือกแล้ว
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {errors.selectedClass && (
                <p className="text-sm text-red-500">{errors.selectedClass}</p>
              )}
            </CardContent>
          </Card>

          {/* Pricing & Discount */}
          {formData.selectedClass && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ราคาและส่วนลด</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ประเภทส่วนลด</Label>
                    <Select 
                      value={formData.discountType} 
                      onValueChange={(value: 'percentage' | 'fixed') => 
                        setFormData(prev => ({ ...prev, discountType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">เปอร์เซ็นต์ (%)</SelectItem>
                        <SelectItem value="fixed">จำนวนเงิน (บาท)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>ส่วนลด</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={formData.discount}
                        onChange={(e) => setFormData(prev => ({ ...prev, discount: Number(e.target.value) }))}
                        min={0}
                        max={formData.discountType === 'percentage' ? 100 : pricing.originalPrice}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        {formData.discountType === 'percentage' ? '%' : 'บาท'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 col-span-2">
                    <Label>รหัสโปรโมชั่น (ถ้ามี)</Label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={formData.promotionCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, promotionCode: e.target.value }))}
                        placeholder="เช่น TRIAL5"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>ราคาเต็ม</span>
                    <span>{formatCurrency(pricing.originalPrice)}</span>
                  </div>
                  {pricing.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>ส่วนลด</span>
                      <span>-{formatCurrency(pricing.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>ราคาสุทธิ</span>
                    <span className="text-lg">{formatCurrency(pricing.finalPrice)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          หลังจากแปลงเป็นนักเรียนแล้ว ระบบจะสร้างข้อมูลผู้ปกครองและนักเรียนอัตโนมัติ
          พร้อมลงทะเบียนในคลาสที่เลือก (สถานะรอชำระเงิน)
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={currentStep === 1 ? onCancel : handlePrevious}
          disabled={loading}
        >
          {currentStep === 1 ? 'ยกเลิก' : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              ย้อนกลับ
            </>
          )}
        </Button>
        
        {currentStep < steps.length ? (
          <Button type="button" onClick={handleNext} className="bg-red-500 hover:bg-red-600">
            ถัดไป
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button 
            type="submit"
            disabled={loading || !formData.selectedClass}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                กำลังดำเนินการ...
              </>
            ) : (
              'ยืนยันการแปลงเป็นนักเรียน'
            )}
          </Button>
        )}
      </div>
    </form>
  );
}