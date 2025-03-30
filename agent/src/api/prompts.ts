import { z } from 'zod';
import { protectedProcedure } from '../trpc';
import { PROMPTS } from '../twitter/prompts';
import { TRPCError } from '@trpc/server';
import { logger } from '../logger';
import { botConfig, db, eq } from 'database';

export const getPromptKeys = protectedProcedure.query(async opts => {
  const keys = Object.keys(PROMPTS);
  return keys;
});

export const getPrompt = protectedProcedure
  .input(z.object({ key: z.string() }))
  .query(async opts => {
    const { key } = opts.input;

    if (!key) {
      throw new TRPCError({ code: 'BAD_REQUEST' });
    }

    const log = logger.child({
      function: 'getPrompt',
      requestId: opts.ctx.requestId,
      key,
    });
    log.info({}, 'get prompt');

    const promptValue = await db.query.botConfig.findFirst({
      where: eq(botConfig.key, key),
      columns: {
        value: true,
      },
    });

    if (!promptValue) {
      log.error({}, 'prompt not found');
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    return promptValue.value;
  });
