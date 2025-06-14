'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Info, Save, X } from 'lucide-react';
import { Student } from '@/types/models';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMakeupRequest, getMakeupCount } from '@/lib/services/makeup';
import { auth } from '@/lib/firebase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MakeupClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student & { parentName: string; parentPhone: string };
  classInfo: {
    id: string;
    name: string;
    teacherId: string;
    branchId: string;
    roomId: string;
  };
  scheduleId: string;
  sessionDate: Date;
  sessionNumber: number;
  onMakeupCreated: () => void;
}

export default function MakeupClassDialog({
  open,
  onOpenChange,
  student,
  classInfo,
  scheduleId,
  sessionDate,
  sessionNumber,
  onMakeupCreated
}: MakeupClassDialogProps) {
  const [loading, setLoading] = useState(false);
  const [checkingCount, setCheckingCount] = useState(true);
  const [makeupCount, setMakeupCount] = useState(0);
  const [formData, setFormData] = useState({
    type: 'ad-hoc' as 'scheduled' | 'ad-hoc',
    reason: ''
  });

  useEffect(() => {
    if (open) {
      checkMakeupCount();
    }
  }, [open, student.id, classInfo.id]);

  const checkMakeupCount = async () => {
    setCheckingCount(true);
    try {
      const count = await getMakeupCount(student.id, classInfo.id);
      setMakeupCount(count);
    } catch (error) {
      console.error('Error checking makeup count:', error);
    } finally {
      setCheckingCount(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.reason.trim()) {
      toast.error('กรุณาระบุเหตุผลที่ขาดเรียน');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error('กรุณาเข้าสู่ระบบ');
      return;
    }

    setLoading(true);
    try {
      await createMakeupRequest({
        type: formData.type,
        originalClassId: classInfo.id,
        originalScheduleId: scheduleId,
        studentId: student.id,
        parentId: student.parentId,
        requestDate: new Date(),
        requestedBy: currentUser.uid,
        reason: formData.reason,
        status: 'pending'
      });

      toast.success('บันทึกการขอ Makeup Class เรียบร้อยแล้ว');
      onMakeupCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        type: 'ad-hoc',
        reason: ''
      });
    } catch (error) {
      console.error('Error creating makeup request:', error);
      toast.error('ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ขอเรียนชดเชย (Makeup Class)</DialogTitle>
          <DialogDescription>
            บันทึกการขอเรียนชดเชยสำหรับ {student.nickname}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">ข้อมูลการขาดเรียน</p>
            <div className="text-sm text-gray-600 space-y-1">
              <p>นักเรียน: {student.name} ({student.nickname})</p>
              <p>คลาส: {classInfo.name}</p>
              <p>ครั้งที่: {sessionNumber} - {formatDate(sessionDate, 'long')}</p>
              <p>ผู้ปกครอง: {student.parentName} ({student.parentPhone})</p>
            </div>
          </div>

          {/* Makeup Count Alert */}
          {!checkingCount && (
            <Alert className={makeupCount >= 4 ? 'border-red-200' : 'border-blue-200'}>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {makeupCount >= 4 ? (
                  <>
                    <strong>หมายเหตุ:</strong> นักเรียนได้ใช้สิทธิ์ Makeup ครบ 4 ครั้งแล้ว 
                    แต่ Admin สามารถอนุมัติเพิ่มได้ตามดุลยพินิจ
                  </>
                ) : (
                  <>
                    นักเรียนใช้สิทธิ์ Makeup ไปแล้ว <strong>{makeupCount}</strong> ครั้ง 
                    (เหลืออีก {4 - makeupCount} ครั้ง)
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Request Type */}
          <div className="space-y-2">
            <Label>ประเภทการขอ</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'scheduled' | 'ad-hoc') => 
                setFormData(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ad-hoc">ขอหลังขาดเรียน (Ad-hoc)</SelectItem>
                <SelectItem value="scheduled">ขอล่วงหน้า (Scheduled)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {formData.type === 'ad-hoc' 
                ? 'สำหรับกรณีขาดเรียนแบบกะทันหัน ไม่ได้แจ้งล่วงหน้า'
                : 'สำหรับกรณีที่รู้ล่วงหน้าว่าจะขาดเรียน'}
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">เหตุผลที่ขาดเรียน *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="เช่น ป่วย, ติดธุระสำคัญ, เดินทางต่างจังหวัด"
              rows={3}
              required
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">ขั้นตอนถัดไป:</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Admin จะจัดตารางเรียนชดเชยให้</li>
                  <li>ผู้ปกครองจะได้รับการแจ้งเตือนผ่าน LINE</li>
                  <li>นักเรียนต้องเข้าเรียนตามวันเวลาที่นัดหมาย</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            ยกเลิก
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !formData.reason.trim()}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {loading ? (
              <>กำลังบันทึก...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                บันทึกการขอ
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}