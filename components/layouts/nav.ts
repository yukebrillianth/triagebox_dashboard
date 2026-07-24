import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Bell,
  Cpu,
  FileText,
  LayoutDashboard,
  Monitor,
  Settings,
  Users,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Show unacked alert badge */
  badge?: 'alerts';
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operasi',
    items: [
      { label: 'Beranda', href: '/', icon: LayoutDashboard },
      { label: 'Command Center', href: '/command', icon: Monitor },
      { label: 'Alert', href: '/alert', icon: Bell, badge: 'alerts' },
    ],
  },
  {
    label: 'Pasien',
    items: [{ label: 'Daftar Pasien', href: '/pasien', icon: Users }],
  },
  {
    label: 'Perangkat',
    items: [{ label: 'Perangkat', href: '/perangkat', icon: Cpu }],
  },
  {
    label: 'Analisis',
    items: [
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
      { label: 'Report', href: '/report', icon: FileText },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { label: 'Status', href: '/status', icon: Activity },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

/** Active match: exact for `/`, prefix for others (except home). */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
