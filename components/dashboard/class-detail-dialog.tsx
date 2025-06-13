'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getEnrollmentsByClass } from '@/lib/services/enrollments';
// ... import services อื่นๆ ที่จำเป็น

interface ClassDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  eventInfo: any | null;
}

export default function ClassDetailDialog({ isOpen, onOpenChange, eventInfo }: ClassDetailDialogProps) {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && eventInfo) {
      setLoading(true);
      getEnrollmentsByClass(eventInfo.extendedProps.classId)
        .then((data) => {
          // @ts-ignore
          setEnrollments(data);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, eventInfo]);

  if (!eventInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{eventInfo.title}</DialogTitle>
        </DialogHeader>
        <div>
          <h4 className="font-medium mb-2">รายชื่อนักเรียน ({enrollments.length} คน)</h4>
          {loading ? <p>กำลังโหลด...</p> : (
            <ul>
              {enrollments.map((enrollment: any) => (
                <li key={enrollment.id}>{enrollment.studentId}</li> // ต้องดึงชื่อนักเรียนมาแสดง
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}