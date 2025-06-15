// app/liff/trial/page.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from 'sonner';

export default function LiffTrialPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    studentName: '',
    studentNickname: '',
    studentAge: '',
    subjectId: '',
    branchId: '',
    preferredDate: null as Date | null,
    preferredTime: '',
    parentPhone: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentName || !formData.subjectId || !formData.branchId || 
        !formData.preferredDate || !formData.preferredTime) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setLoading(true);
    
    try {
      // Get LINE profile
      const profileStr = sessionStorage.getItem('lineProfile');
      const profile = profileStr ? JSON.parse(profileStr) : null;
      
      // TODO: Call API to create trial booking
      const response = await fetch('/api/trial-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          parentLineId: profile?.userId,
          parentName: profile?.displayName || 'ไม่ระบุ',
          source: 'liff'
        })
      });

      if (response.ok) {
        toast.success('จองทดลองเรียนสำเร็จ! เจ้าหน้าที่จะติดต่อกลับเร็วๆ นี้');
        // Close LIFF window
        const liff = (await import('@line/liff')).default;
        liff.closeWindow();
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

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>จองทดลองเรียน</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Student Info */}
            <div className="space-y-2">
              <Label htmlFor="studentName">ชื่อ-นามสกุลนักเรียน *</Label>
              <Input
                id="studentName"
                value={formData.studentName}
                onChange={(e) => setFormData({...formData, studentName: e.target.value})}
                placeholder="ด.ช. ธนกร วิชัยดิษฐ"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentNickname">ชื่อเล่น</Label>
                <Input
                  id="studentNickname"
                  value={formData.studentNickname}
                  onChange={(e) => setFormData({...formData, studentNickname: e.target.value})}
                  placeholder="น้องบอส"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="studentAge">อายุ *</Label>
                <Input
                  id="studentAge"
                  type="number"
                  value={formData.studentAge}
                  onChange={(e) => setFormData({...formData, studentAge: e.target.value})}
                  placeholder="8"
                  min="4"
                  max="18"
                  required
                />
              </div>
            </div>

            {/* Subject Selection */}
            <div className="space-y-2">
              <Label>วิชาที่สนใจ *</Label>
              <Select
                value={formData.subjectId}
                onValueChange={(value) => setFormData({...formData, subjectId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกวิชา" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scratch">Scratch Programming</SelectItem>
                  <SelectItem value="python">Python for Kids</SelectItem>
                  <SelectItem value="robotics">Robotics</SelectItem>
                  <SelectItem value="ai">AI for Kids</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Branch Selection */}
            <div className="space-y-2">
              <Label>สาขา *</Label>
              <Select
                value={formData.branchId}
                onValueChange={(value) => setFormData({...formData, branchId: value})}
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

            {/* Date & Time */}
            <div className="space-y-2">
              <Label>วันที่ต้องการทดลองเรียน *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.preferredDate ? (
                      format(formData.preferredDate, 'PPP', { locale: th })
                    ) : (
                      <span>เลือกวันที่</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.preferredDate || undefined}
                    onSelect={(date) => setFormData({...formData, preferredDate: date || null})}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>เวลาที่สะดวก *</Label>
              <Select
                value={formData.preferredTime}
                onValueChange={(value) => setFormData({...formData, preferredTime: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกเวลา" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="09:00">09:00 - 10:30</SelectItem>
                  <SelectItem value="10:30">10:30 - 12:00</SelectItem>
                  <SelectItem value="13:00">13:00 - 14:30</SelectItem>
                  <SelectItem value="14:30">14:30 - 16:00</SelectItem>
                  <SelectItem value="16:00">16:00 - 17:30</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <Label htmlFor="parentPhone">เบอร์โทรติดต่อ</Label>
              <Input
                id="parentPhone"
                type="tel"
                value={formData.parentPhone}
                onChange={(e) => setFormData({...formData, parentPhone: e.target.value})}
                placeholder="08x-xxx-xxxx"
              />
            </div>

            {/* Submit */}
            <Button 
              type="submit" 
              className="w-full bg-red-500 hover:bg-red-600"
              disabled={loading}
            >
              {loading ? 'กำลังดำเนินการ...' : 'จองทดลองเรียน'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}