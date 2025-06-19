// components/trial/trial-session-dialog.tsx

'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TrialSessionForm from './trial-session-form';
import { Subject, Teacher, Branch } from '@/types/models';

interface TrialSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  students: Array<{
    name: string;
    schoolName?: string;
    gradeLevel?: string;
    subjectInterests: string[];
  }>;
  subjects: Subject[];
  teachers: Teacher[];
  branches: Branch[];
  onSuccess: () => void;
}

export default function TrialSessionDialog({
  isOpen,
  onClose,
  bookingId,
  students,
  subjects,
  teachers,
  branches,
  onSuccess
}: TrialSessionDialogProps) {
  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>นัดหมายทดลองเรียน</DialogTitle>
        </DialogHeader>
        
        <TrialSessionForm
          bookingId={bookingId}
          students={students}
          subjects={subjects}
          teachers={teachers}
          branches={branches}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}