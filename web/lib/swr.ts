'use client';

import useSWR, { SWRConfiguration } from 'swr';

// Wraps SWR with our path convention. The global fetcher (see SWRProvider)
// runs the path through lib/api.ts, which adds the /api prefix + auth token +
// handles 401→refresh. So `useApi<T>('/children')` == GET /api/children.
//
// Pass `null` as the path to skip the fetch (SWR conditional fetching), e.g.
// when a dependency isn't ready yet.
export function useApi<T>(
  path: string | null,
  config?: SWRConfiguration<T>,
) {
  return useSWR<T>(path, config);
}

// Re-export the global mutate for cross-page cache invalidation.
// e.g. after DELETE /caregivers/:id, call `mutateGlobal(`/children/${id}`)`.
export { mutate as mutateGlobal } from 'swr';
