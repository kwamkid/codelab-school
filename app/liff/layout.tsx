import type { Metadata, Viewport } from 'next'
import { LiffErrorBoundary } from '@/components/liff/error-boundary'
import { LiffProvider } from '@/components/liff/liff-provider'
import LiffAuthGuard from '@/components/liff/liff-auth-guard';

import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'CodeLab School',
  description: 'ระบบจัดการโรงเรียนสอนเขียนโปรแกรม',
}

// แยก viewport ออกมาเป็น export แยก
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f97316',
}

export default function LiffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LiffProvider>
      <LiffAuthGuard>
        {children}
      </LiffAuthGuard>
    </LiffProvider>
  );
}