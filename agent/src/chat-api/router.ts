import { z } from 'zod';
import { protectedProcedure, router } from './trpc';
import { TRPCError } from '@trpc/server';
import { getChatById, getMessagesByChatId } from './queries';

const getUserChatMessages = protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input, ctx }) => {
    if (!input.id) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Chat ID is required',
      });
    }

    const chat = await getChatById({ id: input.id });

    if (!chat) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Chat not found',
      });
    }

    if (ctx.user?.id !== chat?.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this chat',
      });
    }

    return getMessagesByChatId({ id: chat.id });
  });

export const appRouter = router({ getUserChatMessages });

export type AppRouter = typeof appRouter;
