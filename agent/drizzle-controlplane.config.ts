import 'dotenv/config'; // make sure to install dotenv package
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'turso',
  out: './controlplane-db-generated',
  schema: './src/controlplane-api/schema.ts',
  // Print all statements
  verbose: true,
  // Always ask for confirmation
  strict: true,
  dbCredentials: {
    url: process.env.CONTROL_TURSO_DATABASE_URL!,
    authToken: process.env.CONTROL_TURSO_AUTH_TOKEN!,
  },
});
