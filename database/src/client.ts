import { createClient } from '@libsql/client';
import { TURSO_AUTH_TOKEN, TURSO_DATABASE_URL } from './const';
import * as schema from './schema';
import { drizzle } from 'drizzle-orm/libsql';

const client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

export const db = drizzle({ client, schema });
