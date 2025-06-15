// app/liff/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LiffPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Get the path from query parameter
    const path = searchParams.get('path') || 'schedule';
    
    // Initialize LIFF
    initializeLiff(path);
  }, [searchParams]);
  
  const initializeLiff = async (path: string) => {
    try {
      // Dynamically import LIFF SDK
      const liff = (await import('@line/liff')).default;
      
      // Get LIFF ID from environment
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      
      if (!liffId) {
        console.error('LIFF ID not configured');
        return;
      }
      
      // Initialize LIFF
      await liff.init({ liffId });
      
      // Check if user is logged in
      if (!liff.isLoggedIn()) {
        // Redirect to LINE Login
        liff.login({
          redirectUri: window.location.href
        });
        return;
      }
      
      // Get user profile
      const profile = await liff.getProfile();
      console.log('LIFF Profile:', profile);
      
      // Store profile in session storage
      sessionStorage.setItem('lineProfile', JSON.stringify(profile));
      
      // Redirect to the appropriate page
      router.push(`/liff/${path}`);
      
    } catch (error) {
      console.error('LIFF initialization failed:', error);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">กำลังเข้าสู่ระบบ...</p>
      </div>
    </div>
  );
}