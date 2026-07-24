import { OfflineBanner } from '@/components/banners';
import { AppSidebar, AppTopbar } from '@/components/layouts';

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid="app-shell"
      className="bg-background flex h-screen overflow-hidden"
    >
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <OfflineBanner />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
