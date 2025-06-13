'use client';

import { useState } from 'react';
import { Enrollment } from '@/types/models';
import { updatePaymentStatus } from '@/lib/services/enrollments';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DollarSign,
  CreditCard,
  Banknote,
  Building2,
  Calendar,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollment: Enrollment & { student?: { name: string; nickname: string } };
  onSuccess: () => void;
}

export default function PaymentDialog({
  open,
  onOpenChange,
  enrollment,
  onSuccess
}: PaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<Enrollment['payment']['method']>(
    enrollment.payment.method
  );
  const [paymentStatus, setPaymentStatus] = useState<Enrollment['payment']['status']>(
    enrollment.payment.status
  );
  const [paidAmount, setPaidAmount] = useState(enrollment.payment.paidAmount);
  const [receiptNumber, setReceiptNumber] = useState(enrollment.payment.receiptNumber || '');

  const handleSubmit = async () => {
    // Validate
    if (paymentStatus === 'paid' && paidAmount !== enrollment.pricing.finalPrice) {
      toast.error(`จำนวนเงินที่ชำระต้องเท่ากับ ${formatCurrency(enrollment.pricing.finalPrice)}`);
      return;
    }

    if (paymentStatus === 'partial' && paidAmount >= enrollment.pricing.finalPrice) {
      toast.error('จำนวนเงินที่ชำระมากกว่าหรือเท่ากับราคาเต็ม กรุณาเลือกสถานะ "ชำระแล้ว"');
      return;
    }

    if (paymentStatus === 'partial' && paidAmount <= 0) {
      toast.error('กรุณาระบุจำนวนเงินที่ชำระ');
      return;
    }

    if ((paymentStatus === 'paid' || paymentStatus === 'partial') && !receiptNumber) {
      toast.error('กรุณาระบุเลขที่ใบเสร็จ');
      return;
    }

    setLoading(true);

    try {
      const paymentData: Enrollment['payment'] = {
        method: paymentMethod,
        status: paymentStatus,
        paidAmount: paymentStatus === 'pending' ? 0 : paidAmount,
        ...(paymentStatus !== 'pending' && { 
          paidDate: new Date(),
          receiptNumber: receiptNumber.trim()
        })
      };

      await updatePaymentStatus(enrollment.id, paymentData);
      
      toast.success('อัพเดตข้อมูลการชำระเงินเรียบร้อยแล้ว');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('ไม่สามารถอัพเดตข้อมูลการชำระเงินได้');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      case 'transfer':
        return <Building2 className="h-4 w-4" />;
      case 'credit':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const remainingAmount = enrollment.pricing.finalPrice - enrollment.payment.paidAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>อัพเดตการชำระเงิน</DialogTitle>
          <DialogDescription>
            {enrollment.student?.nickname || enrollment.student?.name || 'นักเรียน'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Current Payment Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">ราคาคลาส</span>
              <span className="font-medium">{formatCurrency(enrollment.pricing.finalPrice)}</span>
            </div>
            
            {enrollment.pricing.discount > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">ส่วนลด</span>
                <span className="text-green-600">
                  -{enrollment.pricing.discountType === 'percentage' 
                    ? `${enrollment.pricing.discount}%` 
                    : formatCurrency(enrollment.pricing.discount)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-gray-600">ชำระแล้ว</span>
              <span className="font-medium">{formatCurrency(enrollment.payment.paidAmount)}</span>
            </div>

            {enrollment.payment.status !== 'paid' && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">คงเหลือ</span>
                <span className="font-medium text-red-600">{formatCurrency(remainingAmount)}</span>
              </div>
            )}

            {enrollment.payment.paidDate && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">วันที่ชำระล่าสุด</span>
                <span>{formatDate(enrollment.payment.paidDate)}</span>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>วิธีการชำระเงิน</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as Enrollment['payment']['method'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    เงินสด
                  </div>
                </SelectItem>
                <SelectItem value="transfer">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    โอนเงิน
                  </div>
                </SelectItem>
                <SelectItem value="credit">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    บัตรเครดิต
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Status */}
          <div className="space-y-2">
            <Label>สถานะการชำระเงิน</Label>
            <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as Enrollment['payment']['status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    รอชำระ
                  </div>
                </SelectItem>
                <SelectItem value="partial">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    ชำระบางส่วน
                  </div>
                </SelectItem>
                <SelectItem value="paid">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    ชำระแล้ว
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount Paid */}
          {(paymentStatus === 'paid' || paymentStatus === 'partial') && (
            <>
              <div className="space-y-2">
                <Label>จำนวนเงินที่ชำระ</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="number"
                    min="0"
                    max={enrollment.pricing.finalPrice}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="pl-10"
                    placeholder="0"
                  />
                </div>
                {paymentStatus === 'paid' && paidAmount !== enrollment.pricing.finalPrice && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      จำนวนเงินต้องเท่ากับ {formatCurrency(enrollment.pricing.finalPrice)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label>เลขที่ใบเสร็จ</Label>
                <Input
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="REC-2024-001"
                />
              </div>
            </>
          )}

          {/* Summary */}
          {(paymentStatus === 'paid' || paymentStatus === 'partial') && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Calendar className="h-5 w-5" />
                <div>
                  <p className="font-medium">สรุปการชำระเงิน</p>
                  <p className="text-sm mt-1">
                    จะบันทึกการชำระเงิน {formatCurrency(paidAmount)} บาท
                    {paymentStatus === 'partial' && (
                      <span> (คงเหลือ {formatCurrency(enrollment.pricing.finalPrice - paidAmount)} บาท)</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
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
            onClick={handleSubmit}
            className="bg-red-500 hover:bg-red-600"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                บันทึก
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}