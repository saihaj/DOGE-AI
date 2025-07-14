import { TRPCError } from '@trpc/server';
import { createClient as createTursoApiClient } from '@tursodatabase/api';
import { eq } from 'drizzle-orm';
import slugify from 'slugify';
import { z } from 'zod';
import { TURSO_PLATFORM_API_TOKEN, TURSO_PLATFORM_ORG_NAME } from '../const';
import { ControlPlaneDbInstance as db } from './db';
import { ControlPlaneOrganization, ControlPlaneOrganizationDb } from './schema';
import { protectedProcedure, router } from '../trpc';

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
  const tursoInstance = await tursoApiClient.databases.create(instanceName, {
    group: 'rhetor-useast',
    seed: {
      type: 'database',
      name: `${type}base`,
    },
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
