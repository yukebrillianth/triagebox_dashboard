import type { Metadata } from 'next';
import { Geist, IBM_Plex_Mono } from 'next/font/google';

import { RedSoundListener } from '@/components/alerts';
import { QueryProvider } from '@/providers/QueryProvider';
import { RealtimeProvider } from '@/providers/RealtimeProvider';
import { ToastProvider } from '@/providers/ToastProvider';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-mono-plex',
  weight: ['400', '500', '600'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TriageBox',
  description: 'Dashboard command center triase bencana - TriageBox',
};

const themeInitializationScript = `(() => {
  const applyTheme = (dark) => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  };
  try {
    const stored = localStorage.getItem('triagebox.theme');
    applyTheme(stored === 'dark' || (stored !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches));
  } catch (error) {
    applyTheme(matchMedia('(prefers-color-scheme: dark)').matches);
    console.warn('TriageBox theme preference could not be read.', error);
  }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitializationScript }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${plexMono.variable} font-sans antialiased`}
      >
        <QueryProvider>
          <RealtimeProvider>
            <RedSoundListener />
            {children}
          </RealtimeProvider>
        </QueryProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
