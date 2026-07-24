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
          background: '#1e293b',
          color: '#f8fafc',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          padding: '0.75rem 1rem',
          border: '1px solid #334155',
        },
        success: {
          iconTheme: {
            primary: '#14b8a6',
            secondary: '#f8fafc',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#f8fafc',
          },
        },
      }}
    />
  );
}
