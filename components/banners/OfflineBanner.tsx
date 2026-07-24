'use client';

import { useRealtime } from '@/hooks/use-realtime';

export function OfflineBanner() {
  const { connectionStatus } = useRealtime();
  if (connectionStatus !== 'offline') return null;
  return (
    <div
      role="alert"
      data-testid="banner-offline"
      className="bg-triage-red/15 text-triage-red border-triage-red/40 print:hidden shrink-0 border-b px-4 py-2 text-sm"
    >
      Koneksi terputus — mencoba menghubungkan ulang…
    </div>
  );
}
