'use server';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../../agent/src/chat-api/router';
import { API_URL } from '../const';

// Create a tRPC client for server-side (RSC)
export const trpcServerClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_URL}/api/trpc`,
      fetch: fetch.bind(globalThis),
    }),
  ],
});
