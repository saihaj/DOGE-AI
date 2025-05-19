import { z } from 'zod';
import { protectedProcedure, router } from './trpc';

export const appRouter = router({});

export type AppRouter = typeof appRouter;
