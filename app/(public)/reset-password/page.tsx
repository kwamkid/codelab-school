'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode') || '';
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [isValidCode, setIsValidCode] = useState(false);

  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        toast.error('ลิงก์ไม่ถูกต้อง');
        router.push('/login');
        return;
      }

      try {
        await verifyPasswordResetCode(auth, oobCode);
        setIsValidCode(true);
      } catch (error) {
        console.error('Invalid reset code:', error);
        toast.error('ลิงก์หมดอายุหรือไม่ถูกต้อง');
        router.push('/login');
      } finally {
        setVerifying(false);
      }
    };

    verifyCode();
  }, [oobCode, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน');
      return;
    }
    
    if (password.length < 6) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    
    try {
      setLoading(true);
      await confirmPasswordReset(auth, oobCode, password);
      toast.success('เปลี่ยนรหัสผ่านเรียบร้อย');
      router.push('/login');
    } catch (error: any) {
      console.error('Reset password error:', error);
      if (error.code === 'auth/invalid-action-code') {
        toast.error('ลิงก์หมดอายุหรือไม่ถูกต้อง');
      } else {
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>กำลังตรวจสอบลิงก์...</p>
      </div>
    );
  }

  if (!isValidCode) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>ตั้งรหัสผ่านใหม่</CardTitle>
        <CardDescription>
          กรุณากรอกรหัสผ่านใหม่ของคุณ
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              รหัสผ่านใหม่
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              ยืนยันรหัสผ่าน
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            เปลี่ยนรหัสผ่าน
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Suspense fallback={
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>กำลังโหลด...</p>
        </div>
      }>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}