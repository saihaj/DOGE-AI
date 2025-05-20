'use client';
import { useLocalStorage } from '@uidotdev/usehooks';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { AppRouter, TRPCProvider } from '@/lib/trpc';
import { API_URL, PRIVY_COOKIE_NAME } from '@/lib/const';
import { useMemo } from 'react';

export function ClientPrivyTokenProvider({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient: any; // Replace with proper QueryClient type
}) {
  const [privyToken] = useLocalStorage('privy:token', '');

  const trpcClient = useMemo(() => {
    return createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${API_URL}/api/trpc`,
          headers: () => ({
            [PRIVY_COOKIE_NAME]: privyToken || '',
          }),
        }),
      ],
    });
  }, [privyToken]);

  return (
    <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
      {children}
    </TRPCProvider>
  );
}
