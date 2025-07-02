import { createClient } from '@libsql/client';
import { CHAT_TURSO_AUTH_TOKEN, CHAT_TURSO_DATABASE_URL } from '../const';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const client = createClient({
  url: CHAT_TURSO_DATABASE_URL,
  authToken: CHAT_TURSO_AUTH_TOKEN,
});

export const ControlPlaneDbInstance = drizzle({ client, schema });
