import type { NextConfig } from 'next';

const DEFAULT_API_URL = 'http://localhost:3001';

function getApiOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).origin;
  } catch {
    return DEFAULT_API_URL;
  }
}

function getWsOrigin(httpOrigin: string): string {
  return httpOrigin.replace(/^http/, 'ws');
}

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    const apiOrigin = getApiOrigin();
    const wsOrigin = getWsOrigin(apiOrigin);

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: *",
              "font-src 'self' data:",
              `connect-src 'self' ${apiOrigin} ${wsOrigin} http://localhost:3001 ws://localhost:3001`,
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
