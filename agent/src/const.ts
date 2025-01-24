export const TWITTER_API_KEY = (() => {
  if (!process.env.TWITTER_IO_API_KEY) {
    throw new Error('TWITTER_IO_API_KEY is required');
  }
  return process.env.TWITTER_IO_API_KEY;
})();
export const TWITTER_USERNAME = (() => {
  if (!process.env.TWITTER_USERNAME) {
    throw new Error('TWITTER_USERNAME is not set');
  }
  return process.env.TWITTER_USERNAME;
})();
export const TWITTER_PASSWORD = (() => {
  if (!process.env.TWITTER_PASSWORD) {
    throw new Error('TWITTER_PASSWORD is not set');
  }
  return process.env.TWITTER_PASSWORD;
})();
export const TWITTER_EMAIL = (() => {
  if (!process.env.TWITTER_EMAIL) {
    throw new Error('TWITTER_EMAIL is not set');
  }
  return process.env.TWITTER_EMAIL;
})();
export const TWITTER_2FA_SECRET = (() => {
  if (!process.env.TWITTER_2FA_SECRET) {
    throw new Error('TWITTER_2FA_SECRET is not set');
  }
  return process.env.TWITTER_2FA_SECRET;
})();
export const DISCORD_SERVER_URL = (() => {
  if (!process.env.DISCORD_SERVER_URL) {
    throw new Error('DISCORD_SERVER_URL is not set');
  }
  return process.env.DISCORD_SERVER_URL;
})();
export const MAX_TWEET_LENGTH = 280;
export const TWITTER_API_BASE_URL = 'https://api.twitterapi.io';
/**
 * Various error messages we use in the agent.
 */
export const REJECTION_REASON = {
  REPLY_SCOPE_LIMITED: 'REPLY_SCOPE_LIMITED',
  NO_TWEET_RETRIEVED: 'NO_TWEET_RETRIEVED',
  FAILED_TO_PARSE_RESPONSE: 'FAILED_TO_PARSE_RESPONSE',
  NESTED_REPLY_NOT_SUPPORTED: 'NESTED_REPLY_NOT_SUPPORTED',
  ACTION_NOT_SUPPORTED: 'ACTION_NOT_SUPPORTED',
  NO_QUESTION_DETECTED: 'NO_QUESTION_DETECTED',
  SPAM_DETECTED_DO_NOT_ENGAGE: 'SPAM_DETECTED_DO_NOT_ENGAGE',
} as const;
