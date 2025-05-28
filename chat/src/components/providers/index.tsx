'use client';
import { API_URL, PRIVY_COOKIE_NAME } from '@/lib/const';
import { AppRouter, TRPCProvider } from '@/lib/trpc/client';
import { makeQueryClient } from '@/lib/trpc/query-client';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import {
  QueryClient,
  QueryClientProvider,
  isServer,
} from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { ClientPrivyTokenProvider } from './ClientPrivyTokenProvider';
import { PostHogProvider } from './PostHogProvider';
import { RateLimitProvider, useRateLimit } from './RateLimitProvider';
import { ClientOnly } from '../client-only';

let browserQueryClient: QueryClient | undefined = undefined;
function getQueryClient() {
  if (isServer) {
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

export function Providers({ children }: { children: React.ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();

  // Fallback TRPC client for server-side rendering (no token)
  const fallbackTrpcClient = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${API_URL}/api/trpc`,
        headers: () => ({
          [PRIVY_COOKIE_NAME]: '',
        }),
      }),
    ],
  });

  return (
    <PrivyProvider
      appId="cma5o9e5t00dric0opxjxfjuc"
      clientId="client-WY6L6yXLaPvbM94Fo9arL3ncuWyRXL4vaTSJtQMCCH2Mv"
      config={{
        appearance: {
          showWalletLoginFirst: false,
          walletChainType: 'solana-only',
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'all-users',
          },
        },
        // @ts-ignore i don't want to deal with the types here right now.
        externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },
      }}
    >
      <RateLimitProvider>
        <PostHogProvider>
          <QueryClientProvider client={queryClient}>
            {isServer ? (
              <TRPCProvider
                trpcClient={fallbackTrpcClient}
                queryClient={queryClient}
              >
                {children}
              </TRPCProvider>
            ) : (
              <ClientOnly>
                <ClientPrivyTokenProvider queryClient={queryClient}>
                  {children}
                </ClientPrivyTokenProvider>
              </ClientOnly>
            )}
          </QueryClientProvider>
        </PostHogProvider>
      </RateLimitProvider>
    </PrivyProvider>
  );
}

export { useRateLimit };
