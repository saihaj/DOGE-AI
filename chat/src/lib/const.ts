export const API_URL = (() => {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not set in your .env');
  }
  return process.env.NEXT_PUBLIC_API_URL;
})();
export const CF_COOKIE_NAME = 'CF_Authorization';
export const PRIVY_COOKIE_NAME = 'privy-token';
export const CF_BACKEND_HEADER_NAME = 'cf-authorization-token';
export const IS_LOCAL = (() => {
  if (!process.env.NEXT_PUBLIC_VERCEL_ENV) {
    return true;
  }
  return false;
})();
