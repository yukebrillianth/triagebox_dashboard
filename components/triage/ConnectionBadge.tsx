import { cn } from '@/lib/cn';

export type ConnectionBadgeStatus = 'connected' | 'connecting' | 'offline';

type ConnectionBadgeProps = {
  status: ConnectionBadgeStatus;
  className?: string;
};

function connectionLabel(status: ConnectionBadgeStatus): string {
  switch (status) {
    case 'connected':
      return 'Terhubung';
    case 'connecting':
      return 'Menghubungkan';
    case 'offline':
      return 'Offline';
  }
}

function connectionClass(status: ConnectionBadgeStatus): string {
  switch (status) {
    case 'connected':
      return 'text-triage-green';
    case 'connecting':
      return 'text-triage-yellow';
    case 'offline':
      return 'text-triage-red-ink';
  }
}

function dotClass(status: ConnectionBadgeStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-triage-green';
    case 'connecting':
      return 'bg-triage-yellow';
    case 'offline':
      return 'bg-triage-red';
  }
}

export function ConnectionBadge({ status, className }: ConnectionBadgeProps) {
  return (
    <span
      data-testid="connection-badge"
      data-status={status}
      className={cn(
        'inline-flex items-center gap-2 text-xs font-medium',
        connectionClass(status),
        className
      )}
    >
      <span
        className={cn('inline-block size-2.5 shrink-0', dotClass(status))}
        aria-hidden
      />
      {connectionLabel(status)}
    </span>
  );
}
