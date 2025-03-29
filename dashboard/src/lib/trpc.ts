import type { AppRouter } from '../../../agent/src/trpc';
import { QueryClient } from '@tanstack/react-query';
import { createTRPCContext } from '@trpc/tanstack-react-query';

export const queryClient = new QueryClient();

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

export { AppRouter };
