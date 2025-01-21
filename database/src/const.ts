import dotenv from 'dotenv';
dotenv.config();

export const TURSO_AUTH_TOKEN = (() => {
  if (!process.env.TURSO_AUTH_TOKEN) {
    throw new Error('TURSO_AUTH_TOKEN is not set');
  }
  return process.env.TURSO_AUTH_TOKEN;
})();
export const TURSO_DATABASE_URL = (() => {
  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error('TURSO_DATABASE_URL is not set');
  }
  return process.env.TURSO_DATABASE_URL;
})();
