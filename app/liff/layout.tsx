import { Metadata, Viewport } from 'next';
import { LiffProvider } from '@/components/liff/liff-provider';

export const metadata: Metadata = {
  title: 'CodeLab School',
  description: 'ระบบจัดการข้อมูลสำหรับผู้ปกครอง',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ef4444',
};

export default function LiffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LiffProvider>
      <div className="min-h-screen max-w-md mx-auto bg-white">
        {children}
      </div>
    </LiffProvider>
  );
}