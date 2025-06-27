'use client';
import { useLocalStorage } from '@uidotdev/usehooks';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { AppRouter, TRPCProvider } from '@/lib/trpc/client';
import { API_URL, PRIVY_COOKIE_NAME } from '@/lib/const';
import { useEffect, useMemo } from 'react';
import { useToken } from '@privy-io/react-auth';

export function ClientPrivyTokenProvider({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient: any; // Replace with proper QueryClient type
}) {
  const { getAccessToken } = useToken();
  const [privyToken] = useLocalStorage('privy:token', '');

  useEffect(() => {
    // Run on mount
    getAccessToken();

    // Add focus event listener for window focus
    window.addEventListener('focus', getAccessToken);

    // Cleanup: Remove event listener on unmount
    return () => {
      window.removeEventListener('focus', getAccessToken);
    };
  }, []); // Empty deps to run only on mount/unmount

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
