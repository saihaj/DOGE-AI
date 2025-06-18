import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from './trpc';
import { TRPCError } from '@trpc/server';
import {
  getChatById,
  getMessagesByChatId,
  updateChatVisibility,
} from './queries';
import {
  db,
  eq,
  message as messageDbSchema,
  chat as chatDbSchema,
  asc,
} from 'database';
import { BentoCache, bentostore } from 'bentocache';
import { redisDriver } from 'bentocache/drivers/redis';
import Redis from 'ioredis';
import { CHAT_REDIS_URL } from '../const';

const chatBento = new BentoCache({
  default: 'redis',
  stores: {
    redis: bentostore().useL2Layer(
      redisDriver({
        connection: new Redis(CHAT_REDIS_URL, {
          family: 6,
          connectionName: 'bento-chatredis',
        }),
      }),
    ),
  },
});

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
        message: `Chat not found: ${input.id}`,
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

const makeChatPublic = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
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
        message: `Chat not found: ${input.id}`,
      });
    }

    if (ctx.user?.id !== chat?.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this chat',
      });
    }

    if (chat.visibility === 'public') {
      return chat;
    }

    try {
      await updateChatVisibility({
        id: chat.id,
        visibility: 'public',
      });

      return chat;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

const getPublicChatMessages = publicProcedure
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
        message: `Chat not found: ${input.id}`,
      });
    }

    if (chat.visibility !== 'public') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this chat',
      });
    }

    return {
      chat,
      messages: await getMessagesByChatId({ id: chat.id }),
    };
  });

const getTweetMessages = publicProcedure
  .input(z.object({ tweetId: z.string() }))
  .query(async ({ input, ctx }) => {
    if (!input.tweetId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Tweet ID is required',
      });
    }

    const chat = await chatBento.getOrSet(
      `chatTweetId:${input.tweetId}`,
      async () => {
        const c = await db.query.chat.findFirst({
          where: eq(chatDbSchema.tweetId, input.tweetId),
          columns: {
            id: true,
          },
        });

        if (!c) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Tweet not found: ${input.tweetId}`,
          });
        }

        return c;
      },
      {
        ttl: '1hr',
      },
    );

    if (!chat) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Tweet not found: ${input.tweetId}`,
      });
    }

    const messages = await chatBento.getOrSet(
      `chatMessages:${chat.id}`,
      async () => {
        const msgs = await db.query.message.findMany({
          where: eq(messageDbSchema.chat, chat.id),
          orderBy: asc(messageDbSchema.createdAt),
          columns: {
            id: true,
            text: true,
            createdAt: true,
            role: true,
          },
        });

        return msgs.map(m => {
          const { text, ...rest } = m;

          if (rest.role === 'user') {
            const cleanedText = text.replace(/@\w+/g, '');
            return {
              ...rest,
              content: cleanedText.trim() || text,
            };
          }

          return {
            ...rest,
            content: text,
          };
        });
      },
      {
        ttl: '1hr',
      },
    );

    return {
      chat,
      messages,
    };
  });

export const appRouter = router({
  getUserChatMessages,
  getPublicChatMessages,
  makeChatPublic,
  getTweetMessages,
});

export type AppRouter = typeof appRouter;
