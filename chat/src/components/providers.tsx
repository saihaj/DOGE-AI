'use client';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { PostHogProvider } from './PostHogProvider';

export function Providers({ children }: { children: React.ReactNode }) {
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
      <PostHogProvider>{children}</PostHogProvider>
    </PrivyProvider>
  );
}
