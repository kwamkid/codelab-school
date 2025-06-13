'use client';

import { useState, useEffect } from 'react';
import { Enrollment, Class, Subject, Branch } from '@/types/models';
import { getClasses } from '@/lib/services/classes';
import { getSubject } from '@/lib/services/subjects';
import { getBranch } from '@/lib/services/branches';
import { transferStudent } from '@/lib/services/enrollments';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { 
  Loader2, 
  ArrowRightLeft,
  Calendar,
  Users,
  MapPin,
  Clock,
  AlertCircle
} from 'lucide-react';
import { formatDate, formatCurrency, getDayName } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollment: Enrollment & { student?: { name: string; nickname: string } };
  currentClassId: string;
  onSuccess: () => void;
}

interface ClassWithDetails extends Class {
  subject?: Subject;
  branch?: Branch;
}

export default function TransferDialog({
  open,
  onOpenChange,
  enrollment,
  currentClassId,
  onSuccess
}: TransferDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [availableClasses, setAvailableClasses] = useState<ClassWithDetails[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassWithDetails | null>(null);
  const [filterBranch, setFilterBranch] = useState<string>('all');

  useEffect(() => {
    if (open) {
      loadAvailableClasses();
    }
  }, [open]);

  useEffect(() => {
    if (selectedClassId && availableClasses.length > 0) {
      const cls = availableClasses.find(c => c.id === selectedClassId);
      setSelectedClass(cls || null);
    } else {
      setSelectedClass(null);
    }
  }, [selectedClassId, availableClasses]);

  const loadAvailableClasses = async () => {
    setLoadingClasses(true);
    try {
      // Get all classes
      const classes = await getClasses();
      
      // Filter classes that student can transfer to
      const validClasses = classes.filter(cls => {
        // Skip current class
        if (cls.id === currentClassId) return false;
        
        // Only published or started classes
        if (!['published', 'started'].includes(cls.status)) return false;
        
        // Class must have available seats
        if (cls.enrolledCount >= cls.maxStudents) return false;
        
        // Class end date must be in future
        if (new Date(cls.endDate) < new Date()) return false;
        
        return true;
      });

      // Load subject and branch details for each class
      const classesWithDetails = await Promise.all(
        validClasses.map(async (cls) => {
          const [subject, branch] = await Promise.all([
            getSubject(cls.subjectId),
            getBranch(cls.branchId)
          ]);
          
          return {
            ...cls,
            subject: subject || undefined,
            branch: branch || undefined
          };
        })
      );

      setAvailableClasses(classesWithDetails);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('ไม่สามารถโหลดรายการคลาสได้');
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedClass) {
      toast.error('กรุณาเลือกคลาสที่ต้องการย้าย');
      return;
    }

    setLoading(true);

    try {
      await transferStudent(
        enrollment.id,
        selectedClass.id,
        selectedClass.branchId
      );
      
      toast.success('ย้ายนักเรียนเรียบร้อยแล้ว');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error transferring student:', error);
      const errorMessage = error instanceof Error ? error.message : 'ไม่สามารถย้ายนักเรียนได้';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Filter classes by branch
  const filteredClasses = filterBranch === 'all' 
    ? availableClasses
    : availableClasses.filter(cls => cls.branchId === filterBranch);

  // Get unique branches
  const branches = Array.from(
    new Set(availableClasses.map(cls => cls.branchId))
  ).map(branchId => {
    const cls = availableClasses.find(c => c.branchId === branchId);
    return {
      id: branchId,
      name: cls?.branch?.name || branchId
    };
  });

  const canTransfer = selectedClass && 
    selectedClass.pricing.totalPrice === enrollment.pricing.finalPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>ย้ายคลาส</DialogTitle>
          <DialogDescription>
            ย้าย {enrollment.student?.nickname || enrollment.student?.name || 'นักเรียน'} ไปคลาสอื่น
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {loadingClasses ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : availableClasses.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ไม่มีคลาสที่สามารถย้ายได้ในขณะนี้
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Branch Filter */}
              {branches.length > 1 && (
                <div className="space-y-2">
                  <Label>กรองตามสาขา</Label>
                  <Select value={filterBranch} onValueChange={setFilterBranch}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกสาขา</SelectItem>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Class Selection */}
              <div className="space-y-2">
                <Label>เลือกคลาสที่ต้องการย้าย</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกคลาส..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredClasses.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        ไม่มีคลาสในสาขานี้
                      </div>
                    ) : (
                      filteredClasses.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: cls.subject?.color || '#gray' }}
                            />
                            <span>{cls.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {cls.enrolledCount}/{cls.maxStudents}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Class Details */}
              {selectedClass && (
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{selectedClass.branch?.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {selectedClass.daysOfWeek.map(d => getDayName(d)).join(', ')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {selectedClass.startTime} - {selectedClass.endTime} น.
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {selectedClass.enrolledCount}/{selectedClass.maxStudents} คน
                        {selectedClass.enrolledCount >= selectedClass.maxStudents - 2 && (
                          <span className="text-orange-600 ml-1">(ใกล้เต็ม)</span>
                        )}
                      </span>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">ราคาคอร์ส</span>
                        <span className="font-medium">
                          {formatCurrency(selectedClass.pricing.totalPrice)}
                        </span>
                      </div>
                      
                      {selectedClass.pricing.totalPrice !== enrollment.pricing.finalPrice && (
                        <Alert className="mt-2 bg-amber-50 border-amber-200">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-amber-800">
                            ราคาคลาสใหม่ ({formatCurrency(selectedClass.pricing.totalPrice)}) 
                            ต่างจากราคาที่ชำระไว้ ({formatCurrency(enrollment.pricing.finalPrice)})
                            อาจต้องเรียกเก็บเพิ่มหรือคืนเงินส่วนต่าง
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="pt-2">
                      <p className="text-xs text-gray-500">
                        วันเริ่มเรียน: {formatDate(selectedClass.startDate, 'long')}
                      </p>
                      <p className="text-xs text-gray-500">
                        วันจบคอร์ส: {formatDate(selectedClass.endDate, 'long')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Warning for unpaid enrollment */}
              {enrollment.payment.status !== 'paid' && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    นักเรียนยังชำระเงินไม่ครบ กรุณาติดตามการชำระเงินหลังย้ายคลาส
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleTransfer}
            className="bg-red-500 hover:bg-red-600"
            disabled={loading || !selectedClass || loadingClasses}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังย้าย...
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                ยืนยันการย้าย
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}