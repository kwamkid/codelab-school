// app/test-line-login/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export default function TestLineLoginPage() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Check for success/error from callback
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const userId = searchParams.get('userId');
    
    if (success === 'true' && userId) {
      toast.success('Login สำเร็จ!');
      setProfile({ userId });
    } else if (error) {
      let errorMessage = 'เกิดข้อผิดพลาดในการ Login';
      switch (error) {
        case 'missing_params':
          errorMessage = 'ข้อมูลไม่ครบถ้วน';
          break;
        case 'not_configured':
          errorMessage = 'ยังไม่ได้ตั้งค่า LINE Login';
          break;
        case 'token_exchange_failed':
          errorMessage = 'ไม่สามารถแลกเปลี่ยน Token ได้';
          break;
        case 'profile_fetch_failed':
          errorMessage = 'ไม่สามารถดึงข้อมูลผู้ใช้ได้';
          break;
      }
      toast.error(errorMessage);
    }
  }, [searchParams]);
  
  const handleLineLogin = () => {
    const channelId = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID;
    
    if (!channelId) {
      toast.error('กรุณาตั้งค่า LINE Login Channel ID ใน .env.local');
      return;
    }
    
    setLoading(true);
    
    // LINE Login URL
    const state = Math.random().toString(36).substring(7);
    const nonce = Math.random().toString(36).substring(7);
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/callback/line`);
    
    const loginUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
      `response_type=code&` +
      `client_id=${channelId}&` +
      `redirect_uri=${redirectUri}&` +
      `state=${state}&` +
      `scope=profile%20openid%20email&` +
      `nonce=${nonce}`;
    
    // Save state for verification
    sessionStorage.setItem('line_login_state', state);
    
    // Redirect to LINE Login
    window.location.href = loginUrl;
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              ทดสอบ LINE Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600">
              ทดสอบการ Login ด้วย LINE Account
            </p>
            
            <Button
              onClick={handleLineLogin}
              disabled={loading}
              className="w-full bg-[#00B900] hover:bg-[#00A000]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              <span className="ml-2">Login with LINE</span>
            </Button>
            
            {profile && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Login สำเร็จ!</h3>
                </div>
                <p className="text-sm text-green-700">
                  User ID: {profile.userId}
                </p>
              </div>
            )}
            
            <div className="mt-6 text-sm text-gray-500">
              <p className="font-semibold">วิธีทดสอบ:</p>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>ตั้งค่า LINE Login Channel ID ใน Settings</li>
                <li>คลิกปุ่ม Login with LINE</li>
                <li>Login ด้วย LINE Account</li>
                <li>ดูผลลัพธ์ที่แสดง</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}