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
  'User-Agent': `@dogexbt/crawler@${version}`,
};
