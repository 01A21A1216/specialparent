'use client';

import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { api } from '../lib/api';

// Global SWR config. All useApi() / useSWR(path) calls share this fetcher,
// so migrating a page is `useApi<T>('/path')` — no per-file fetcher wiring.
export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (path: string) => api(path),
        // Revalidate silently when the user returns to the tab / window.
        revalidateOnFocus: true,
        // Dedupe identical concurrent requests within 5 s (e.g. two components
        // asking for /children mount at the same time → one HTTP call).
        dedupingInterval: 5_000,
        // Don't hammer the server on transient errors.
        errorRetryCount: 1,
        errorRetryInterval: 2_000,
        // Keep last-known-good data visible while a background revalidate runs.
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
