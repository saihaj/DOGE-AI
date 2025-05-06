'use client';
import * as React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <PrivyProvider
        appId="cma5o9e5t00dric0opxjxfjuc"
        clientId="client-WY6L6yXLaPvbM94Fo9arL3ncuWyRXL4vaTSJtQMCCH2Mv"
        config={{
          appearance: {
            showWalletLoginFirst: false,
            walletChainType: 'solana-only',
          },
          loginMethods: ['wallet', 'twitter'],
          embeddedWallets: {
            solana: {
              createOnLogin: 'all-users',
            },
          },
          // @ts-ignore i don't want to deal with the types here right now.
          externalWallets: {
            solana: { connectors: toSolanaWalletConnectors() },
          },
        }}
      >
        {children}
      </PrivyProvider>
    </NextThemesProvider>
  );
}
