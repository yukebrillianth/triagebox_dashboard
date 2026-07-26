import { AppShell } from '@/components/layouts';

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
