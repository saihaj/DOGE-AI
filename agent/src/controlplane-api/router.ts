import { TRPCError } from '@trpc/server';
import { createClient as createTursoApiClient } from '@tursodatabase/api';
import { eq } from 'drizzle-orm';
import slugify from 'slugify';
import { z } from 'zod';
import { ControlPlaneDbInstance as db } from './db';
import { ControlPlaneOrganization, ControlPlaneOrganizationDb } from './schema';
import { protectedProcedure, router } from './trpc';

const tursoApiClient = createTursoApiClient({
  org: '...',
  token: '',
});

async function createTursoDbInstance({
  orgId,
  orgSlug,
  name,
  type,
}: {
  orgId: string;
  orgSlug: string;
  name: string;
  type: 'kb' | 'action';
}) {
  const id = `${orgSlug}-${name}`;
  const instanceName = `${orgSlug.substring(0, 40)}-${name}`;
  const tursoInstance = await tursoApiClient.databases.create(instanceName, {
    group: '',
    seed: {
      type: 'database',
      name: type,
    },
  });

  const dbInsert = await db
    .insert(ControlPlaneOrganizationDb)
    .values({
      id,
      name,
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

const createOrganization = protectedProcedure
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
        name: 'knowledgebase',
        type: 'kb',
      }),
      createTursoDbInstance({
        orgSlug: org.slug,
        orgId: org.id,
        name: 'actions',
        type: 'action',
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

export const controlPlaneRouter = router({
  createOrganization,
});

export type ControlPlaneRouter = typeof controlPlaneRouter;
