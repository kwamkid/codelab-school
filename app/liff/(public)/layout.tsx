import { LiffProvider } from '@/components/liff/liff-provider';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LiffProvider requireLogin={false}>
      {children}
    </LiffProvider>
  );
}