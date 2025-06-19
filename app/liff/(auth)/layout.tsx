import { LiffProvider } from '@/components/liff/liff-provider';
import LiffAuthGuard from '@/components/liff/liff-auth-guard';

export default function AuthenticatedLayout({
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