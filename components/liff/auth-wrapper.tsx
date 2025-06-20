'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/liff/liff-provider';
import { Loader2 } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function AuthWrapper({ children, requireAuth = true }: AuthWrapperProps) {
  const router = useRouter();
  const { isLoggedIn, isLoading, liff } = useLiff();

  useEffect(() => {
    if (!isLoading && requireAuth && !isLoggedIn && liff) {
      // Redirect to login
      liff.login();
    }
  }, [isLoading, isLoggedIn, requireAuth, liff]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requireAuth && !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}