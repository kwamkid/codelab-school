'use client';

import { useState } from 'react';
import { MakeupClass, Student, Class } from '@/types/models';
import { recordMakeupAttendance, cancelMakeupClass } from '@/lib/services/makeup';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarCheck,
  Save,
  CalendarDays
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { auth } from '@/lib/firebase/client';
import EditMakeupScheduleDialog from './edit-makeup-schedule-dialog';

interface MakeupDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  makeup: MakeupClass;
  student: Student & { parentName: string; parentPhone: string };
  classInfo: Class;
  onUpdated: () => void;
}

const statusColors = {
  'pending': 'bg-yellow-100 text-yellow-700',
  'scheduled': 'bg-blue-100 text-blue-700',
  'completed': 'bg-green-100 text-green-700',
  'cancelled': 'bg-red-100 text-red-700',
};

const statusLabels = {
  'pending': 'รอจัดตาราง',
  'scheduled': 'นัดแล้ว',
  'completed': 'เรียนแล้ว',
  'cancelled': 'ยกเลิก',
};

const statusIcons = {
  'pending': AlertCircle,
  'scheduled': CalendarCheck,
  'completed': CheckCircle,
  'cancelled': XCircle,
};

export default function MakeupDetailDialog({
  open,
  onOpenChange,
  makeup,
  student,
  classInfo,
  onUpdated
}: MakeupDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [attendanceNote, setAttendanceNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showEditSchedule, setShowEditSchedule] = useState(false);
  
  const StatusIcon = statusIcons[makeup.status];

  const handleRecordAttendance = async (status: 'present' | 'absent') => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error('กรุณาเข้าสู่ระบบ');
      return;
    }
    
    setLoading(true);
    try {
      await recordMakeupAttendance(makeup.id, {
        status,
        checkedBy: currentUser.uid,
        note: attendanceNote
      });
      
      toast.success(status === 'present' ? 'บันทึกการเข้าเรียนเรียบร้อยแล้ว' : 'บันทึกการขาดเรียนเรียบร้อยแล้ว');
      onUpdated();
    } catch (error) {
      console.error('Error recording attendance:', error);
      toast.error('ไม่สามารถบันทึกการเข้าเรียนได้');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('กรุณาระบุเหตุผลในการยกเลิก');
      return;
    }
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error('กรุณาเข้าสู่ระบบ');
      return;
    }
    
    setLoading(true);
    try {
      await cancelMakeupClass(makeup.id, cancelReason, currentUser.uid);
      toast.success('ยกเลิก Makeup Class เรียบร้อยแล้ว');
      onUpdated();
    } catch (error) {
      console.error('Error cancelling makeup:', error);
      toast.error('ไม่สามารถยกเลิกได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>รายละเอียด Makeup Class</span>
            <Badge className={statusColors[makeup.status]}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusLabels[makeup.status]}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            ข้อมูลการขอเรียนชดเชยของ {student.nickname}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Information */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-gray-700">ข้อมูลนักเรียน</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">ชื่อ:</span>
                <span>{student.name} ({student.nickname})</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">ผู้ปกครอง:</span>
                <span>{student.parentName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="font-medium">เบอร์โทร:</span>
                <span>{student.parentPhone}</span>
              </div>
            </div>
          </div>

          {/* Original Class Information */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-gray-700">คลาสเดิม</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="text-sm">
                <span className="font-medium">คลาส:</span> {classInfo.name}
              </div>
              <div className="text-sm">
                <span className="font-medium">รหัสคลาส:</span> {classInfo.code}
              </div>
              <div className="text-sm">
                <span className="font-medium">วันที่ขอ:</span> {formatDate(makeup.requestDate, 'long')}
              </div>
              <div className="text-sm">
                <span className="font-medium">เหตุผล:</span> {makeup.reason}
              </div>
            </div>
          </div>

          {/* Makeup Schedule (if scheduled) */}
          {makeup.makeupSchedule && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-gray-700">ตารางเรียนชดเชย</h3>
                {makeup.status === 'scheduled' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowEditSchedule(true)}
                  >
                    <CalendarDays className="h-3 w-3 mr-1" />
                    เปลี่ยนวันนัด
                  </Button>
                )}
              </div>
              <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">วันที่:</span>
                  <span>{formatDate(makeup.makeupSchedule.date, 'long')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">เวลา:</span>
                  <span>{makeup.makeupSchedule.startTime} - {makeup.makeupSchedule.endTime} น.</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">ห้อง:</span>
                  <span>{makeup.makeupSchedule.roomId}</span>
                </div>
                {makeup.makeupSchedule.confirmedAt && (
                  <div className="text-xs text-gray-500 mt-2">
                    นัดหมายเมื่อ {formatDate(makeup.makeupSchedule.confirmedAt, 'long')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attendance Result (if completed) */}
          {makeup.attendance && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-gray-700">ผลการเข้าเรียน</h3>
              <div className={`rounded-lg p-4 ${
                makeup.attendance.status === 'present' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className="flex items-center gap-2 text-sm">
                  {makeup.attendance.status === 'present' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium">
                    {makeup.attendance.status === 'present' ? 'เข้าเรียน' : 'ขาดเรียน'}
                  </span>
                </div>
                {makeup.attendance.note && (
                  <p className="text-sm mt-2">{makeup.attendance.note}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  บันทึกเมื่อ {formatDate(makeup.attendance.checkedAt, 'long')}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {makeup.notes && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-gray-700">หมายเหตุ</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm">{makeup.notes}</p>
              </div>
            </div>
          )}

          {/* Actions for scheduled status */}
          {makeup.status === 'scheduled' && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-medium text-sm text-gray-700">บันทึกการเข้าเรียน</h3>
              <div className="space-y-2">
                <Label htmlFor="attendance-note">หมายเหตุ (ถ้ามี)</Label>
                <Textarea
                  id="attendance-note"
                  value={attendanceNote}
                  onChange={(e) => setAttendanceNote(e.target.value)}
                  placeholder="เช่น มาสาย 10 นาที, เรียนดีมาก"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleRecordAttendance('present')}
                  disabled={loading}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  เข้าเรียน
                </Button>
                <Button
                  onClick={() => handleRecordAttendance('absent')}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  ขาดเรียน
                </Button>
              </div>
            </div>
          )}

          {/* Cancel button for pending/scheduled */}
          {(makeup.status === 'pending' || makeup.status === 'scheduled') && (
            <div className="pt-4 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700"
                    disabled={loading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    ยกเลิก Makeup Class
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>ยืนยันการยกเลิก</AlertDialogTitle>
                    <AlertDialogDescription>
                      คุณแน่ใจหรือไม่ที่จะยกเลิก Makeup Class นี้?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="my-4">
                    <Label htmlFor="cancel-reason">เหตุผลในการยกเลิก *</Label>
                    <Textarea
                      id="cancel-reason"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="กรุณาระบุเหตุผล..."
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ไม่ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      disabled={!cancelReason.trim()}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      ยืนยันยกเลิก
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </DialogContent>
      
      {/* Edit Schedule Dialog */}
      {showEditSchedule && (
        <EditMakeupScheduleDialog
          open={showEditSchedule}
          onOpenChange={setShowEditSchedule}
          makeup={makeup}
          student={student}
          classInfo={classInfo}
          onUpdated={() => {
            setShowEditSchedule(false);
            onUpdated();
          }}
        />
      )}
    </Dialog>
  );
}