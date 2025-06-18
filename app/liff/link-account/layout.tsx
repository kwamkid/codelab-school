import { LiffProvider } from '@/components/liff/liff-provider';

export default function LinkAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LiffProvider>
      {children}
    </LiffProvider>
  );
}