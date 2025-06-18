'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/liff/liff-provider';
import { getParentByLineId } from '@/lib/services/parents';
import { Loader2, UserPlus, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LiffAuthGuardProps {
  children: React.ReactNode;
  requireRegistration?: boolean;
}

export default function LiffAuthGuard({ 
  children, 
  requireRegistration = true 
}: LiffAuthGuardProps) {
  const router = useRouter();
  const { profile, isLoggedIn, liff } = useLiff();
  const [checking, setChecking] = useState(true);
  const [hasParent, setHasParent] = useState(false);

  useEffect(() => {
    checkParentStatus();
  }, [isLoggedIn, profile]);

  const checkParentStatus = async () => {
    if (!isLoggedIn || !profile?.userId) {
      setChecking(false);
      return;
    }

    try {
      const parent = await getParentByLineId(profile.userId);
      setHasParent(!!parent);
    } catch (error) {
      console.error('Error checking parent status:', error);
      setHasParent(false);
    } finally {
      setChecking(false);
    }
  };

  // Loading state
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">กำลังตรวจสอบข้อมูล...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>กรุณาเข้าสู่ระบบ</CardTitle>
            <CardDescription>
              คุณต้องเข้าสู่ระบบด้วย LINE ก่อนใช้งาน
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => liff?.login()}
            >
              เข้าสู่ระบบด้วย LINE
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No parent registration
  if (requireRegistration && !hasParent) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle>ยินดีต้อนรับ!</CardTitle>
              <CardDescription>
                คุณยังไม่ได้ลงทะเบียนในระบบ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  กรุณาเลือกวิธีการลงทะเบียน:
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button 
                  className="w-full bg-red-500 hover:bg-red-600"
                  onClick={() => router.push('/liff/register')}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  ลงทะเบียนออนไลน์
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">หรือ</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <LinkIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">ลงทะเบียนที่โรงเรียนแล้ว?</p>
                      <p className="text-gray-600">
                        หากคุณได้ลงทะเบียนที่เคาน์เตอร์แล้ว 
                        กรุณาติดต่อ Admin เพื่อขอลิงก์เชื่อมต่อบัญชี LINE
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t text-center">
                <p className="text-sm text-gray-600">
                  ติดต่อสอบถาม: 
                  <a href="tel:0812345678" className="text-red-600 font-medium">
                    081-234-5678
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Has parent - render children
  return <>{children}</>;
}