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
import { Student, Parent } from '@/types/models';
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
  absentSessions: Array<{
    sessionNumber: number;
    sessionDate: Date;
    makeupDate?: Date;
    makeupStatus?: 'pending' | 'scheduled' | 'completed';
  }>;
  onScheduleMakeup: (sessionNumber: number, makeupDate: Date, time: string, note: string) => Promise<void>;
}

export default function MakeupClassDialog({
  open,
  onOpenChange,
  student,
  classInfo,
  absentSessions,
  onScheduleMakeup
}: MakeupClassDialogProps) {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [makeupDate, setMakeupDate] = useState<string>('');
  const [makeupTime, setMakeupTime] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Filter sessions that need makeup (absent and not yet scheduled)
  const pendingSessions = absentSessions.filter(
    session => session.makeupStatus === 'pending' || !session.makeupStatus
  );

  const handleSave = async () => {
    if (!selectedSession || !makeupDate || !makeupTime) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setSaving(true);
    try {
      await onScheduleMakeup(
        selectedSession,
        new Date(makeupDate),
        makeupTime,
        note
      );
      
      toast.success('บันทึกการนัด Makeup Class เรียบร้อยแล้ว');
      
      // Reset form
      setSelectedSession(null);
      setMakeupDate('');
      setMakeupTime('');
      setNote('');
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error scheduling makeup:', error);
      toast.error('ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>นัดหมาย Makeup Class</DialogTitle>
          <DialogDescription>
            สำหรับ {student.nickname} ({student.name})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">ข้อมูลนักเรียน</p>
            <div className="text-sm text-gray-600">
              <p>ผู้ปกครอง: {student.parentName}</p>
              <p>เบอร์โทร: {student.parentPhone}</p>
            </div>
          </div>

          {/* Select Absent Session */}
          <div className="space-y-2">
            <Label>เลือกครั้งที่ขาดเรียน</Label>
            <Select
              value={selectedSession?.toString()}
              onValueChange={(value) => setSelectedSession(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกครั้งที่ขาด" />
              </SelectTrigger>
              <SelectContent>
                {pendingSessions.map((session) => (
                  <SelectItem key={session.sessionNumber} value={session.sessionNumber.toString()}>
                    ครั้งที่ {session.sessionNumber} - {formatDate(session.sessionDate, 'long')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Makeup Date */}
          <div className="space-y-2">
            <Label htmlFor="makeup-date">วันที่นัด Makeup</Label>
            <Input
              id="makeup-date"
              type="date"
              value={makeupDate}
              onChange={(e) => setMakeupDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Makeup Time */}
          <div className="space-y-2">
            <Label htmlFor="makeup-time">เวลานัด</Label>
            <Input
              id="makeup-time"
              type="time"
              value={makeupTime}
              onChange={(e) => setMakeupTime(e.target.value)}
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">หมายเหตุ (ถ้ามี)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ติดต่อผู้ปกครองแล้ว, นัดที่ห้องพิเศษ"
              rows={3}
            />
          </div>

          {/* Scheduled Makeups */}
          {absentSessions.filter(s => s.makeupStatus === 'scheduled').length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">Makeup ที่นัดไว้แล้ว</p>
                  <ul className="mt-1 space-y-1">
                    {absentSessions
                      .filter(s => s.makeupStatus === 'scheduled')
                      .map(session => (
                        <li key={session.sessionNumber} className="text-blue-700">
                          ครั้งที่ {session.sessionNumber} → {formatDate(session.makeupDate!, 'long')}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            ยกเลิก
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving || !selectedSession || !makeupDate || !makeupTime}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {saving ? (
              <>กำลังบันทึก...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                บันทึกการนัด
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}