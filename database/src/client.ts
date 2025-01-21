import { createClient } from '@libsql/client/web';
import { TURSO_AUTH_TOKEN, TURSO_DATABASE_URL } from './const';

import { drizzle } from 'drizzle-orm/libsql';

const client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

export const db = drizzle({ client });
