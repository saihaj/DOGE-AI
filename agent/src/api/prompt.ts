import { z } from 'zod';
import { protectedProcedure } from '../trpc';
import { PROMPTS } from '../twitter/prompts';
import { TRPCError } from '@trpc/server';
import { logger } from '../logger';
import { commitPrompt, getPrompt, revertPrompt } from '../prompt-registry';
import { and, db, desc, eq, lt, promptCommit } from 'database';

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

    const promptValue = await getPrompt(key);

    if (!promptValue) {
      log.error({}, 'prompt not found');
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    return {
      content: promptValue.content,
      commitId: promptValue.commitId,
    };
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
    if (!currentPrompt) {
      log.error({}, 'prompt not found');
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Prompt "${key}" not found`,
      });
    }

    if (currentPrompt.content === value) {
      log.warn(
        {
          active: currentPrompt.content,
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
    const currentVariables = extractTemplateVariableNames(
      currentPrompt.content,
    );
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
    const state = await commitPrompt({
      key,
      value,
      message: `By ${opts.ctx.userEmail}`,
    });

    if (state.commitId) {
      log.info(state, 'updated prompt');
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

export const getPromptVersions = protectedProcedure
  .input(
    z.object({
      key: z.string(),
      cursor: z.string().optional(),
      limit: z.number(),
    }),
  )
  .query(async opts => {
    const { key, cursor, limit } = opts.input;
    const log = logger.child({
      function: 'getPromptVersions',
      requestId: opts.ctx.requestId,
      key,
    });
    log.info({}, 'get prompt versions');

    const latestPrompt = await getPrompt(key);
    if (!latestPrompt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Prompt "${key}" not found`,
      });
    }

    const promptHistory = await db.query.promptCommit.findMany({
      where: and(
        eq(promptCommit.promptId, latestPrompt.promptId),
        cursor ? lt(promptCommit.createdAt, cursor) : undefined,
      ),
      orderBy: (promptCommit, { asc }) => desc(promptCommit.createdAt),
      columns: {
        id: true,
        createdAt: true,
        content: true,
      },
      limit: limit + 1,
    });

    // Process the results
    const hasNext = promptHistory.length > limit;
    if (hasNext) promptHistory.pop(); // Remove the extra item

    const nextCursor =
      promptHistory.length > 0
        ? promptHistory[promptHistory.length - 1].createdAt
        : null;

    return {
      items: promptHistory.map(item => ({
        commitId: item.id,
        createdAt: item.createdAt,
        content: item.content,
      })),
      nextCursor: hasNext ? nextCursor : null,
    };
  });

export const revertPromptVersion = protectedProcedure
  .input(
    z.object({
      key: z.string(),
      commitId: z.string(),
    }),
  )
  .mutation(async opts => {
    const { key, commitId } = opts.input;
    const log = logger.child({
      function: 'revertPromptVersion',
      requestId: opts.ctx.requestId,
      key,
    });
    log.info({}, 'revert prompt version');

    const status = await revertPrompt({
      key,
      targetCommitId: commitId,
    });

    if (status) {
      log.info(status, 'reverted prompt version');
      return {
        status: 'success',
      };
    }
    log.error({}, 'failed to revert prompt version');
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to revert prompt version',
    });
  });
