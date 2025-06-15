// app/liff/layout.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LiffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isInLine, setIsInLine] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    initializeLiff();
  }, []);

  const initializeLiff = async () => {
    try {
      // Check if LIFF is available
      const liff = (await import('@line/liff')).default;
      
      // Get LIFF ID
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        console.error('LIFF ID not configured');
        setIsLoading(false);
        return;
      }

      // Initialize LIFF
      await liff.init({ liffId });
      
      // Check if running in LINE
      setIsInLine(liff.isInClient());
      
      // Check login status
      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        setProfile(profile);
        sessionStorage.setItem('lineProfile', JSON.stringify(profile));
      } else if (isInLine) {
        // If in LINE but not logged in, do login
        liff.login();
        return;
      }
      
    } catch (error) {
      console.error('LIFF initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-red-500" />
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!isInLine) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">กรุณาเปิดใน LINE</h2>
          <p className="text-gray-600 mb-4">
            หน้านี้ต้องเปิดผ่านแอป LINE เท่านั้น
          </p>
          <p className="text-sm text-gray-500">
            กรุณาเข้าผ่าน Rich Menu หรือลิงก์ที่ส่งใน LINE
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-500 text-white p-4 shadow-md">
        <h1 className="text-lg font-semibold">CodeLab School</h1>
        {profile && (
          <p className="text-sm mt-1">สวัสดีคุณ {profile.displayName}</p>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}