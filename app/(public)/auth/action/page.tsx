'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function FirebaseAuthActionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');
    
    console.log('Firebase Action - Mode:', mode);
    console.log('Firebase Action - Code:', oobCode);
    
    if (mode === 'resetPassword' && oobCode) {
      router.push(`/reset-password?oobCode=${oobCode}`);
    } else if (mode === 'verifyEmail' && oobCode) {
      router.push(`/verify-email?oobCode=${oobCode}`);
    } else {
      console.error('Invalid action mode:', mode);
      router.push('/login');
    }
  }, [router, searchParams]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>กำลังดำเนินการ...</p>
      </div>
    </div>
  );
}