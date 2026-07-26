'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

import { isStale } from './formatters';

type StaleIndicatorProps = {
  lastUpdate: string | null | undefined;
  thresholdMs?: number;
  className?: string;
};

export function StaleIndicator({
  lastUpdate,
  thresholdMs = 45_000,
  className,
}: StaleIndicatorProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!isStale(lastUpdate, thresholdMs, now)) return null;

  return (
    <span
      data-testid="stale-indicator"
      className={cn(
        'text-triage-yellow border-triage-yellow inline-flex items-center border-l-2 pl-2 text-sm font-semibold',
        className
      )}
    >
      Data lama
    </span>
  );
}
