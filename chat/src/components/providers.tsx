'use client';
import { PrivyProvider } from '@privy-io/react-auth';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId="cma5o9e5t00dric0opxjxfjuc"
      clientId="client-WY6L6yXLaPvbM94Fo9arL3ncuWyRXL4vaTSJtQMCCH2Mv"
    >
      {children}
    </PrivyProvider>
  );
}
