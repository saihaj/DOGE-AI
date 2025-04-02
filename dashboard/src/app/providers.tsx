'use client';
import {
  QueryClient,
  QueryClientProvider,
  isServer,
} from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { useMemo } from 'react';
import { TRPCProvider, AppRouter } from '@/lib/trpc';
import { API_URL, CF_BACKEND_HEADER_NAME, CF_COOKIE_NAME } from '@/lib/const';
import { useCookie } from '@/hooks/use-cookie';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

export function App() {
  const queryClient = getQueryClient();

  return <QueryClientProvider client={queryClient}></QueryClientProvider>;
}

let browserQueryClient: QueryClient | undefined = undefined;
function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const token = useCookie(CF_COOKIE_NAME);

  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();

  // Create TRPC client with useMemo to react to token changes
  const trpcClient = useMemo(() => {
    return createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${API_URL}/api/trpc`,
          headers: () => ({
            [CF_BACKEND_HEADER_NAME]: token || '', // Fallback to empty string if token is undefined
          }),
        }),
      ],
    });
  }, [token]);

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
