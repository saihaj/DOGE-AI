import 'dotenv/config'; // make sure to install dotenv package
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'turso',
  out: './actiondb-generated',
  schema: './src/actiondb-schema.ts',
  // Print all statements
  verbose: true,
  // Always ask for confirmation
  strict: true,
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
