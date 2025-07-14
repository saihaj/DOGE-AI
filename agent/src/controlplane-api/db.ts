import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import {
  CONTROLPLANE_TURSO_AUTH_TOKEN,
  CONTROLPLANE_TURSO_DATABASE_URL,
} from '../const';
import * as schema from './schema';

const client = createClient({
  url: CONTROLPLANE_TURSO_DATABASE_URL,
  authToken: CONTROLPLANE_TURSO_AUTH_TOKEN,
});

export const ControlPlaneDbInstance = drizzle({ client, schema });
