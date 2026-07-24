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
        'bg-triage-yellow/15 text-triage-yellow inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
        className
      )}
    >
      stale
    </span>
  );
}
