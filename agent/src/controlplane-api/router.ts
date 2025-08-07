import { TRPCError } from '@trpc/server';
import {
  CreatedDatabase,
  createClient as createTursoApiClient,
} from '@tursodatabase/api';
import { and, desc, eq, gt, lt } from 'drizzle-orm';
import slugify from 'slugify';
import { z } from 'zod';
import {
  IS_PROD,
  TURSO_PLATFORM_API_TOKEN,
  TURSO_PLATFORM_ORG_NAME,
} from '../const';
import { ControlPlaneDbInstance as db } from './db';
import {
  ControlPlaneOrganization,
  ControlPlaneOrganizationDb,
  ControlPlanePrompt,
  ControlPlanePromptCommit,
} from './schema';
import { protectedProcedure, router } from '../trpc';
import { commitPrompt, getPrompt, revertPrompt } from './prompt-registry';
import { bento } from '../cache';

const tursoApiClient = createTursoApiClient({
  org: TURSO_PLATFORM_ORG_NAME,
  token: TURSO_PLATFORM_API_TOKEN,
});

async function createTursoDbInstance({
  orgId,
  orgSlug,
  type,
}: {
  orgId: string;
  orgSlug: string;
  type: 'kb' | 'actions';
}) {
  const id = `${orgSlug}-${type}`;
  const instanceName = `${orgSlug.substring(0, 40)}-${type}`;
  const tursoInstance = IS_PROD
    ? await tursoApiClient.databases.create(instanceName, {
        group: 'rhetor-useast',
        seed: {
          type: 'database',
          name: `${type}base`,
        },
      })
    : await Promise.resolve<CreatedDatabase>({
        hostname: 'localhost',
        name: instanceName,
        id: 'local-dev-id',
      });

  const dbInsert = await db
    .insert(ControlPlaneOrganizationDb)
    .values({
      id,
      name: instanceName,
      hostname: tursoInstance.hostname,
      organization: orgId,
    })
    .returning();

  if (dbInsert.length === 0) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create organization database',
    });
  }

  const insertedOrgDb = dbInsert[0];

  return {
    id: insertedOrgDb.id,
    name: insertedOrgDb.name,
    hostname: insertedOrgDb.hostname,
    organization: insertedOrgDb.organization,
  };
}

async function getOrgDb({
  type,
  orgSlug,
}: {
  type: 'kb' | 'action';
  orgSlug: string;
}) {
  const id = `${orgSlug}-${type}`;
  const dbInstance = await db.query.ControlPlaneOrganizationDb.findFirst({
    where: eq(ControlPlaneOrganizationDb.id, id),
  });

  if (!dbInstance) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Database instance "${type}" not found for organization "${orgSlug}"`,
    });
  }

  return {
    id: dbInstance.id,
    name: dbInstance.name,
    hostname: dbInstance.hostname,
    organization: dbInstance.organization,
  };
}

async function getOrganizationBySlug(slug: string) {
  const org = await db.query.ControlPlaneOrganization.findFirst({
    where: eq(ControlPlaneOrganization.slug, slug),
  });

  if (!org) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Organization with slug "${slug}" not found`,
    });
  }

  const [kbInstance, actionInstance] = await Promise.all([
    getOrgDb({
      type: 'kb',
      orgSlug: slug,
    }),
    getOrgDb({
      type: 'action',
      orgSlug: slug,
    }),
  ]);

  return {
    name: org.name,
    slug: org.slug,
    id: org.id,
    location: org.location,
    knowledgebaseHost: kbInstance.hostname,
    actionsDbHost: actionInstance.hostname,
  };
}

export const createOrganization = protectedProcedure
  .input(z.object({ name: z.string(), slug: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const { name: _name, slug: _slug } = input;

    const slug = slugify(_slug, {
      replacement: '-',
      lower: true,
      trim: true,
      strict: true,
    });
    const name = _name.trim();

    const existingOrg = await db.query.ControlPlaneOrganization.findFirst({
      where: eq(ControlPlaneOrganization.slug, slug),
    });

    if (existingOrg) {
      ctx.logger.error(
        {
          slug,
        },
        'Organization already exists',
      );
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Organization with slug "${slug}" already exists`,
      });
    }

    const newOrg = await db
      .insert(ControlPlaneOrganization)
      .values({
        id: crypto.randomUUID(),
        name,
        slug,
        location: 'us-east',
      })
      .onConflictDoNothing({
        target: ControlPlaneOrganization.slug,
      })
      .returning();

    if (newOrg.length === 0) {
      ctx.logger.error(
        {
          slug,
        },
        'Failed to create organization',
      );
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create organization',
      });
    }

    const org = newOrg[0];
    ctx.logger.info(
      {
        slug,
        organizationId: org.id,
      },
      'Organization created successfully',
    );

    const [knowledgebase, actions] = await Promise.all([
      createTursoDbInstance({
        orgSlug: org.slug,
        orgId: org.id,
        type: 'kb',
      }),
      createTursoDbInstance({
        orgSlug: org.slug,
        orgId: org.id,
        type: 'actions',
      }),
    ]);

    return {
      name: org.name,
      slug: org.slug,
      id: org.id,
      location: org.location,
      knowledgebaseHost: knowledgebase.hostname,
      actionsDbHost: actions.hostname,
    };
  });

export const getOrganization = protectedProcedure
  .input(z.object({ slug: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const { slug } = input;

    ctx.logger.info(
      {
        slug,
      },
      'Fetching organization by slug',
    );

    return getOrganizationBySlug(slug);
  });

export const getControlPlanePromptByKey = protectedProcedure
  .input(z.object({ key: z.string(), orgId: z.string() }))
  .query(async opts => {
    const { key, orgId } = opts.input;

    const log = opts.ctx.logger.child({
      function: 'getControlPlanePromptByKey',
      key,
      orgId,
    });
    log.info({}, 'get prompt');

    const promptValue = await getPrompt({
      key,
      orgId,
    });

    if (!promptValue) {
      log.error({}, 'prompt not found');
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    return {
      content: promptValue.content,
      commitId: promptValue.commitId,
    };
  });

export const getControlPlanePromptKeys = protectedProcedure
  .input(z.object({ orgId: z.string() }))
  .query(async opts => {
    const { orgId } = opts.input;
    const log = opts.ctx.logger.child({
      function: 'getControlPlanePromptKeys',
      orgId,
    });
    log.info({}, 'get prompt keys');

    return bento.getOrSet(
      `PROMPT_KEYS_${orgId}`,
      async () => {
        const keys = await db
          .select({ key: ControlPlanePrompt.key })
          .from(ControlPlanePrompt)
          .where(eq(ControlPlanePrompt.organization, orgId))
          .all();

        return keys.map(k => k.key);
      },
      { ttl: '1d' },
    );
  });

export const getOrgs = protectedProcedure
  .input(
    z.object({
      cursor: z.string().optional(),
      limit: z.number(),
    }),
  )
  .query(async opts => {
    const { limit, cursor } = opts.input;

    const orgs = await db.query.ControlPlaneOrganization.findMany({
      where: cursor
        ? gt(ControlPlaneOrganization.createdAt, cursor)
        : undefined,
      orderBy: (orgs, { asc }) => asc(orgs.createdAt),
      limit: limit + 1,
      columns: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
      },
    });

    const hasMore = orgs.length > limit;

    if (hasMore) {
      orgs.pop(); // Remove the last item to ensure we only return the requested limit
    }

    const nextCursor = hasMore ? orgs[orgs.length - 1].createdAt : null;

    return {
      items: orgs,
      nextCursor,
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

export const updateControlPlanePromptByKey = protectedProcedure
  .input(z.object({ key: z.string(), value: z.string(), orgId: z.string() }))
  .mutation(async opts => {
    const { key, value, orgId } = opts.input;
    const log = opts.ctx.logger.child({
      function: 'updateControlPlanePromptByKey',
      key,
      orgId,
    });
    log.info({}, 'patch prompt');

    if (!value) {
      log.error({}, 'no value found');
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No value found',
      });
    }

    const currentPrompt = await getPrompt({
      key,
      orgId,
    });
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
      orgId,
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

export const getControlPlanePromptVersions = protectedProcedure
  .input(
    z.object({
      key: z.string(),
      cursor: z.string().optional(),
      limit: z.number(),
      orgId: z.string(),
    }),
  )
  .query(async opts => {
    const { key, cursor, limit, orgId } = opts.input;
    const log = opts.ctx.logger.child({
      function: 'getControlPlanePromptVersions',
      key,
      orgId,
    });
    log.info({}, 'get prompt versions');

    const latestPrompt = await getPrompt({
      key,
      orgId,
    });
    if (!latestPrompt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Prompt "${key}" not found`,
      });
    }

    const promptHistory = await db.query.ControlPlanePromptCommit.findMany({
      where: and(
        eq(ControlPlanePromptCommit.promptId, latestPrompt.promptId),
        cursor ? lt(ControlPlanePromptCommit.createdAt, cursor) : undefined,
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

export const revertControlPlanePromptVersion = protectedProcedure
  .input(
    z.object({
      key: z.string(),
      commitId: z.string(),
      orgId: z.string(),
    }),
  )
  .mutation(async opts => {
    const { key, commitId, orgId } = opts.input;
    const log = opts.ctx.logger.child({
      function: 'revertControlPlanePromptVersion',
      key,
      orgId,
    });
    log.info({}, 'revert prompt version');

    const status = await revertPrompt({
      key,
      targetCommitId: commitId,
      orgId,
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
