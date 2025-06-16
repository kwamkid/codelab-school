// components/trial/reschedule-trial-dialog.tsx

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  CalendarIcon, 
  Clock, 
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { TrialSession } from '@/types/models';
import { updateTrialSession } from '@/lib/services/trial-bookings';
import { cn } from '@/lib/utils';

interface RescheduleTrialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  session: TrialSession;
  onSuccess: () => void;
}

export default function RescheduleTrialDialog({
  isOpen,
  onClose,
  session,
  onSuccess
}: RescheduleTrialDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date(session.scheduledDate));
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);

  // Auto-set end time when start time changes
  useEffect(() => {
    if (startTime && startTime !== session.startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const endHour = hours + 1; // 1 hour session
      const endMinutes = minutes.toString().padStart(2, '0');
      setEndTime(`${endHour.toString().padStart(2, '0')}:${endMinutes}`);
    }
  }, [startTime, session.startTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      toast.error('กรุณาเลือกวันที่');
      return;
    }
    
    if (!startTime || !endTime) {
      toast.error('กรุณาระบุเวลา');
      return;
    }

    setLoading(true);

    try {
      await updateTrialSession(session.id, {
        scheduledDate: selectedDate,
        startTime,
        endTime
      });

      toast.success('เปลี่ยนวันนัดหมายสำเร็จ');
      onSuccess();
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนวันนัดหมาย');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เปลี่ยนวันนัดหมาย</DialogTitle>
          <DialogDescription>
            เปลี่ยนวันและเวลานัดหมายสำหรับ {session.studentName}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label>วันที่ใหม่</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP', { locale: th }) : "เลือกวันที่"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>เวลาเริ่ม</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>เวลาสิ้นสุด</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Current Schedule Info */}
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <p className="text-gray-600">นัดหมายเดิม:</p>
            <p className="font-medium">
              {format(new Date(session.scheduledDate), 'PPP', { locale: th })}
              {' '}เวลา {session.startTime} - {session.endTime}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              ยกเลิก
            </Button>
            <Button 
              type="submit"
              disabled={loading}
              className="bg-red-500 hover:bg-red-600"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึกการเปลี่ยนแปลง'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}