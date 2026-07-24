export const siteConfig = {
  name: 'TriageBox',
  description: 'Dashboard command center triase bencana',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const;

/** Default NestJS API + Socket.IO host */
export const DEFAULT_API_URL = 'http://localhost:3001';
