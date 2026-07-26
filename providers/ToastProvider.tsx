'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--card)',
          color: 'var(--foreground)',
          borderRadius: '0.125rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          padding: '0.75rem 1rem',
          border: '1px solid var(--border)',
          boxShadow: 'none',
        },
        success: {
          iconTheme: {
            primary: 'var(--accent)',
            secondary: 'var(--card)',
          },
        },
        error: {
          iconTheme: {
            primary: 'var(--triage-red)',
            secondary: 'var(--card)',
          },
        },
      }}
    />
  );
}
