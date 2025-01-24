import { version } from '../package.json';
export const API_BASE_URL = 'https://api.congress.gov';
export const API_VERSION = 'v3';
export const API_KEY = (() => {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not set');
  }
  return process.env.API_KEY;
})();
export const BILL_CONGRESS = '118';
export const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': `@dogeai/crawler@${version}`,
};
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
