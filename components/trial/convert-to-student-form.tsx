// components/trial/convert-to-student-form.tsx

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User,
  GraduationCap,
  Calendar,
  DollarSign,
  Tag,
  Info,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { TrialBooking, TrialSession, Class, Subject } from '@/types/models';
import { convertTrialToEnrollment } from '@/lib/services/trial-bookings';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { formatCurrency } from '@/lib/utils';

interface ConvertToStudentFormProps {
  booking: TrialBooking;
  session: TrialSession;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ConvertToStudentForm({
  booking,
  session,
  onSuccess,
  onCancel
}: ConvertToStudentFormProps) {
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Form state
  const [selectedClass, setSelectedClass] = useState('');
  const [discount, setDiscount] = useState(5); // Default 5% for trial conversion
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [promotionCode, setPromotionCode] = useState('TRIAL5');
  
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
  }, [selectedClass, discount, discountType]);

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
        setSelectedClass(eligibleClasses[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลคลาสได้');
    } finally {
      setLoadingClasses(false);
    }
  };

  const calculatePricing = () => {
    if (!selectedClass) {
      setPricing({ originalPrice: 0, discountAmount: 0, finalPrice: 0 });
      return;
    }

    const selectedClassData = classes.find(c => c.id === selectedClass);
    if (!selectedClassData) return;

    const original = selectedClassData.pricing.totalPrice;
    let discountAmount = 0;

    if (discountType === 'percentage') {
      discountAmount = (original * discount) / 100;
    } else {
      discountAmount = discount;
    }

    const final = Math.max(0, original - discountAmount);

    setPricing({
      originalPrice: original,
      discountAmount,
      finalPrice: final
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClass) {
      toast.error('กรุณาเลือกคลาส');
      return;
    }

    setLoading(true);

    try {
      const result = await convertTrialToEnrollment(
        booking.id,
        session.id,
        selectedClass,
        {
          originalPrice: pricing.originalPrice,
          discount: pricing.discountAmount,
          discountType,
          finalPrice: pricing.finalPrice,
          promotionCode: promotionCode || undefined
        }
      );

      toast.success('แปลงเป็นนักเรียนสำเร็จ');
      onSuccess();
    } catch (error: any) {
      console.error('Error converting to student:', error);
      if (error.message?.includes('Phone number already exists')) {
        toast.error('เบอร์โทรนี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบข้อมูล');
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
      {/* Student & Parent Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ข้อมูลนักเรียนและผู้ปกครอง</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-gray-500">นักเรียน</Label>
              <p className="font-medium">{session.studentName}</p>
              {studentData?.schoolName && (
                <p className="text-sm text-gray-600">
                  {studentData.schoolName} {studentData.gradeLevel && `(${studentData.gradeLevel})`}
                </p>
              )}
            </div>
            <div>
              <Label className="text-gray-500">ผู้ปกครอง</Label>
              <p className="font-medium">{booking.parentName}</p>
              <p className="text-sm text-gray-600">{booking.parentPhone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                const isSelected = selectedClass === cls.id;
                const availableSeats = cls.maxStudents - cls.enrolledCount;
                
                return (
                  <div
                    key={cls.id}
                    onClick={() => setSelectedClass(cls.id)}
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
        </CardContent>
      </Card>

      {/* Pricing & Discount */}
      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ราคาและส่วนลด</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ประเภทส่วนลด</Label>
                <Select value={discountType} onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}>
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
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    min={0}
                    max={discountType === 'percentage' ? 100 : pricing.originalPrice}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {discountType === 'percentage' ? '%' : 'บาท'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 col-span-2">
                <Label>รหัสโปรโมชั่น (ถ้ามี)</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={promotionCode}
                    onChange={(e) => setPromotionCode(e.target.value)}
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

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          หลังจากแปลงเป็นนักเรียนแล้ว ระบบจะสร้างข้อมูลผู้ปกครองและนักเรียนอัตโนมัติ
          พร้อมลงทะเบียนในคลาสที่เลือก (สถานะรอชำระเงิน)
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          ยกเลิก
        </Button>
        <Button 
          type="submit"
          disabled={loading || !selectedClass}
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
      </div>
    </form>
  );
}