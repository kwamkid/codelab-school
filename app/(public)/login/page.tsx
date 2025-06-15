'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { getGeneralSettings } from '@/lib/services/settings';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const { signIn, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getGeneralSettings();
        setSettings(data);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('ไม่พบผู้ใช้งานนี้ในระบบ');
      } else if (err.code === 'auth/wrong-password') {
        setError('รหัสผ่านไม่ถูกต้อง');
      } else if (err.code === 'auth/invalid-email') {
        setError('รูปแบบอีเมลไม่ถูกต้อง');
      } else {
        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            {settings?.logoUrl ? (
              <div className="relative w-[200px] h-[50px]">
                <Image 
                  src={settings.logoUrl} 
                  alt={settings.schoolName || 'School Logo'} 
                  width={200}
                  height={50}
                  className="object-contain"
                  priority
                  unoptimized // สำหรับ external URL
                />
              </div>
            ) : (
              <div className="relative w-[200px] h-[50px]">
                <Image 
                  src="/logo.svg" 
                  alt="CodeLab Logo" 
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            )}
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold">เข้าสู่ระบบ</CardTitle>
            <CardDescription>
              ระบบจัดการโรงเรียนสอนพิเศษ
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@codelabschool.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-red-500 hover:bg-red-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                'เข้าสู่ระบบ'
              )}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm text-gray-600">
            ลืมรหัสผ่าน? <a href="#" className="text-red-600 hover:underline">ติดต่อผู้ดูแลระบบ</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}