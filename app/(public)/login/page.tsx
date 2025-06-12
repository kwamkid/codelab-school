'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setIsLoading(true);
    
    try {
      await signIn(email, password);
      toast.success('เข้าสู่ระบบสำเร็จ');
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific Firebase auth errors
      const firebaseError = error as { code?: string };
      
      if (firebaseError.code === 'auth/user-not-found') {
        toast.error('ไม่พบผู้ใช้งานนี้');
      } else if (firebaseError.code === 'auth/wrong-password') {
        toast.error('รหัสผ่านไม่ถูกต้อง');
      } else if (firebaseError.code === 'auth/invalid-email') {
        toast.error('รูปแบบอีเมลไม่ถูกต้อง');
      } else {
        toast.error('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="text-6xl font-bold text-red-500">
              {/* Logo placeholder - คุณสามารถใส่ SVG logo จริงตรงนี้ */}
              CODELAB
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            ระบบจัดการโรงเรียน
          </CardTitle>
          <CardDescription className="text-center">
            สำหรับผู้ดูแลระบบเท่านั้น
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@codelab.school"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
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
                disabled={isLoading}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-red-500 hover:bg-red-600 text-white"
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

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>สำหรับผู้ดูแลระบบเท่านั้น</p>
            <p className="mt-2">ผู้ปกครองกรุณาใช้ LINE Login</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}