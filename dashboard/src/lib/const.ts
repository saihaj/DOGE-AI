export const API_URL = (() => {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not set in your .env');
  }
  return process.env.NEXT_PUBLIC_API_URL;
})();
