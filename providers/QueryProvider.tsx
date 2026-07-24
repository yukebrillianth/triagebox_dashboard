'use client';

import { useState, type ReactNode } from 'react';

import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

import { HttpError } from '@/lib/http-error';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            retry: (failureCount, error) => {
              if (error instanceof HttpError) {
                if (error.isRateLimit) return false;
                if (error.isClientError) return false;
                if (error.isServerError) return failureCount < 2;
              }
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 10_000),
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: (failureCount, error) => {
              if (error instanceof HttpError) {
                if (error.isRateLimit) return false;
                if (error.isServerError) return failureCount < 1;
              }
              return false;
            },
            retryDelay: 3000,
          },
        },
        mutationCache: new MutationCache({
          onError: (error) => {
            if (
              error instanceof HttpError &&
              (error.isServerError || error.isRateLimit)
            ) {
              console.warn(`[API ${error.status}]`, error.message);
            }
          },
        }),
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
