import { createClient } from '@libsql/client';
import { TRPCError } from '@trpc/server';
import { manualKbDb } from 'database';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { bento } from '../cache';
import { IS_PROD, TURSO_GROUP_AUTH_TOKEN } from '../const';
import { WithLogger } from '../logger';
import { ControlPlaneDbInstance as db } from './db';
import { ControlPlaneOrganization, ControlPlaneOrganizationDb } from './schema';

export async function getKbDbInstance({
  orgId,
  log,
}: {
  orgId: string;
  log: WithLogger;
}) {
  const logger = log.child({
    organizationId: orgId,
  });

  const org = await bento.getOrSet(
    `getKbInstance-${orgId}`,
    async () => {
      logger.info({}, 'Fetching organization for knowledge base DB instance');
      const o = await db.query.ControlPlaneOrganization.findFirst({
        where: eq(ControlPlaneOrganization.id, orgId),
        columns: {
          id: true,
          slug: true,
        },
      });

      if (!o) {
        logger.error({}, 'Organization not found');
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      return o;
    },
    { ttl: '1d' },
  );

  const dbName = `${org.slug}-kb`;

  const kbDbHostname = await bento.getOrSet(
    `kbDbHostname-${orgId}`,
    async () => {
      logger.info(
        { dbName },
        'Fetching knowledge base database hostname for organization',
      );
      const k = await db.query.ControlPlaneOrganizationDb.findFirst({
        where: and(eq(ControlPlaneOrganizationDb.id, dbName)),
        columns: {
          hostname: true,
        },
      });

      if (!k) {
        logger.error({}, 'Knowledge base database not found for organization');
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Knowledge base database not found for organization',
        });
      }

      return k;
    },
    { ttl: '1d' },
  );

  const kbDbClient = createClient({
    url: !IS_PROD
      ? `libsql://${kbDbHostname.hostname}`
      : `file:./${kbDbHostname.hostname}`,
    authToken: TURSO_GROUP_AUTH_TOKEN,
  });

  return drizzle({
    client: kbDbClient,
    schema: manualKbDb,
  });
}
