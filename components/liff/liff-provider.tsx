'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Liff } from '@line/liff';
import { Loader2 } from 'lucide-react';
import { getLineSettings } from '@/lib/services/line-settings';

interface LiffContextType {
  liff: Liff | null;
  profile: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
  } | null;
  isLoggedIn: boolean;
  isReady: boolean;
  error: Error | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const LiffContext = createContext<LiffContextType>({
  liff: null,
  profile: null,
  isLoggedIn: false,
  isReady: false,
  error: null,
  login: async () => {},
  logout: async () => {},
});

export const useLiff = () => useContext(LiffContext);

interface LiffProviderProps {
  children: React.ReactNode;
}

export function LiffProvider({ children }: LiffProviderProps) {
  const [liff, setLiff] = useState<Liff | null>(null);
  const [profile, setProfile] = useState<LiffContextType['profile']>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      initializeLiff();
    }
  }, [mounted]);

  const initializeLiff = async () => {
    try {
      // Get LIFF ID from settings
      const settings = await getLineSettings();
      
      if (!settings.liffId) {
        throw new Error('LIFF ID ยังไม่ได้ตั้งค่าในระบบ กรุณาติดต่อผู้ดูแลระบบ');
      }
      
      // Dynamic import untuk menghindari SSR issues
      const liffModule = await import('@line/liff');
      const liffInstance = liffModule.default;
      
      // Initialize LIFF
      await liffInstance.init({ liffId: settings.liffId });
      setLiff(liffInstance);
      
      // Check login status
      if (liffInstance.isLoggedIn()) {
        setIsLoggedIn(true);
        
        // Get user profile
        const userProfile = await liffInstance.getProfile();
        setProfile({
          userId: userProfile.userId,
          displayName: userProfile.displayName,
          pictureUrl: userProfile.pictureUrl,
          statusMessage: userProfile.statusMessage,
        });
      }
      
      setIsReady(true);
    } catch (err) {
      console.error('LIFF initialization error:', err);
      setError(err as Error);
      setIsReady(true);
    }
  };

  const login = async () => {
    if (!liff) return;
    
    try {
      await liff.login();
    } catch (err) {
      console.error('LIFF login error:', err);
      setError(err as Error);
    }
  };

  const logout = async () => {
    if (!liff) return;
    
    try {
      await liff.logout();
      setIsLoggedIn(false);
      setProfile(null);
      // Reload to clear state
      window.location.reload();
    } catch (err) {
      console.error('LIFF logout error:', err);
      setError(err as Error);
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  // Loading screen
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-500 mx-auto" />
          <p className="mt-2 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-600 text-sm mb-4">{error.message}</p>
          {error.message.includes('LIFF ID') ? (
            <p className="text-xs text-gray-500">
              กรุณาแจ้งผู้ดูแลระบบเพื่อตั้งค่า LIFF ID ในหน้า Settings → LINE Integration
            </p>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm"
            >
              ลองใหม่อีกครั้ง
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <LiffContext.Provider
      value={{
        liff,
        profile,
        isLoggedIn,
        isReady,
        error,
        login,
        logout,
      }}
    >
      {children}
    </LiffContext.Provider>
  );
}