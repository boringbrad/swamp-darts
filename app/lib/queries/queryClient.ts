import { QueryClient } from '@tanstack/react-query';

let client: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60_000,       // serve from cache for 1 min, then revalidate in background
          retry: 2,
          refetchOnWindowFocus: true,
        },
      },
    });
  }
  return client;
}
