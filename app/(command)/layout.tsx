import { OfflineBanner } from '@/components/banners';

export default function CommandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid="command-layout"
      className="bg-background flex min-h-screen flex-col"
    >
      <OfflineBanner />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
