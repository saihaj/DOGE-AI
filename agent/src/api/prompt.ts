import { getPrompt, setPromptByKey } from '../twitter/prompts';
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

export const getPromptByKey = protectedProcedure
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

// Given a string, it extracts all the template variables
function extractTemplateVariableNames(content: string) {
  const template = content.match(/{{(.*?)}}/g);
  const variableNames = new Set<string>();

  if (template) {
    template.forEach(t => {
      const key = t.replace(/{{|}}/g, '');
      variableNames.add(key);
    });
  }

  return Array.from(variableNames);
}

export const updatePromptByKey = protectedProcedure
  .input(z.object({ key: z.string(), value: z.string() }))
  .mutation(async opts => {
    const { key, value } = opts.input;
    const log = logger.child({
      function: 'updatePromptById',
      requestId: opts.ctx.requestId,
      key,
    });
    log.info({}, 'patch prompt');

    if (!value) {
      log.error({}, 'no value found');
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No value found',
      });
    }

    const currentPrompt = await getPrompt(key);

    if (currentPrompt === value) {
      log.warn(
        {
          active: currentPrompt,
          proposed: value,
        },
        'no change in prompt',
      );

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No change in prompt',
      });
    }

    // validate variables in the current prompt
    const currentVariables = extractTemplateVariableNames(currentPrompt);
    const proposedVariables = extractTemplateVariableNames(value);

    // check if the proposed prompt has the same variables as the current prompt
    if (currentVariables.length !== proposedVariables.length) {
      log.error(
        {
          currentVariables,
          proposedVariables,
        },
        'variable count mismatch',
      );
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Variable count mismatch',
      });
    }

    // check if the proposed prompt has the same variables as the current prompt
    if (currentVariables.some(v => !proposedVariables.includes(v))) {
      log.error(
        {
          currentVariables,
          proposedVariables,
        },
        'variable name mismatch',
      );
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Variable name mismatch',
      });
    }

    // update the prompt
    const state = await setPromptByKey({ key, value }, logger);

    if (state) {
      log.info({}, 'updated prompt');
      return {
        status: 'success',
      };
    }

    log.error({}, 'failed to update prompt');
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update prompt',
    });
  });
