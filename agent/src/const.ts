if (!process.env.PERPLEXITY_API_KEY) {
  throw new Error('PERPLEXITY_API_KEY is not set in your .env');
}
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in your .env');
}
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
}
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
  SPAM_DETECTED_ON_REPLY: 'SPAM_DETECTED_ON_REPLY',
  SPAM_DETECTED_ON_TAG: 'SPAM_DETECTED_ON_TAG',
  SPAM_DETECTED_ON_TWEET_SUMMON: 'SPAM_DETECTED_ON_TWEET_SUMMON',
  ALREADY_REPLIED: 'ALREADY_REPLIED',
  NO_EXACT_MATCH: 'NO_EXACT_MATCH',
  TOO_DEEP_OF_A_THREAD: 'TOO_DEEP_OF_A_THREAD',
  NO_REPLY_FOR_INTERACTION_THREADS: 'NO_REPLY_FOR_INTERACTION_THREADS',
  UNRELATED_BILL: 'UNRELATED_BILL',
  MAX_RECURSION_DEPTH_REACHED: 'MAX_RECURSION_DEPTH_REACHED',
  NO_TWEET_FOUND_TO_REPLY_TO: 'NO_TWEET_FOUND_TO_REPLY_TO',
  NO_BILL_ID_FOUND: 'NO_BILL_ID_FOUND',
  NO_BILL_FOUND: 'NO_BILL_FOUND',
  NO_TAG_ENGAGEMENT_TO_OWN_REPLY: 'NO_TAG_ENGAGEMENT_TO_OWN_REPLY',
} as const;
export const DISCORD_TOKEN = (() => {
  if (!process.env.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN is not set');
  }
  return process.env.DISCORD_TOKEN;
})();
export const DISCORD_APPROVED_CHANNEL_ID = (() => {
  if (!process.env.DISCORD_APPROVED_CHANNEL_ID) {
    throw new Error('DISCORD_APPROVED_CHANNEL_ID is not set in your .env');
  }
  return process.env.DISCORD_APPROVED_CHANNEL_ID;
})();
export const DISCORD_REJECTED_CHANNEL_ID = (() => {
  if (!process.env.DISCORD_REJECTED_CHANNEL_ID) {
    throw new Error('DISCORD_REJECTED_CHANNEL_ID is not set in your .env');
  }
  return process.env.DISCORD_REJECTED_CHANNEL_ID;
})();
export const DISCORD_SERVER_ID = (() => {
  if (!process.env.DISCORD_SERVER_ID) {
    throw new Error('DISCORD_SERVER_ID is not set in your .env');
  }
  return process.env.DISCORD_SERVER_ID;
})();
export const DISCORD_ERROR_LOG_CHANNEL_ID = (() => {
  if (!process.env.DISCORD_ERROR_LOG_CHANNEL_ID) {
    throw new Error('DISCORD_ERROR_LOG_CHANNEL_ID is not set in your .env');
  }
  return process.env.DISCORD_ERROR_LOG_CHANNEL_ID;
})();
export const TWITTER_APP_KEY = (() => {
  if (!process.env.TWITTER_APP_KEY) {
    throw new Error('TWITTER_APP_KEY is not set in your .env');
  }
  return process.env.TWITTER_APP_KEY;
})();
export const TWITTER_APP_SECRET = (() => {
  if (!process.env.TWITTER_APP_SECRET) {
    throw new Error('TWITTER_APP_SECRET is not set in your .env');
  }
  return process.env.TWITTER_APP_SECRET;
})();
export const TWITTER_ACCESS_TOKEN = (() => {
  if (!process.env.TWITTER_ACCESS_TOKEN) {
    throw new Error('TWITTER_ACCESS_TOKEN is not set in your .env');
  }
  return process.env.TWITTER_ACCESS_TOKEN;
})();
export const TWITTER_ACCESS_SECRET = (() => {
  if (!process.env.TWITTER_ACCESS_SECRET) {
    throw new Error('TWITTER_ACCESS_SECRET is not set in your .env');
  }
  return process.env.TWITTER_ACCESS_SECRET;
})();
export const IS_PROD = process.env.NODE_ENV === 'production';
export const DISCORD_LOCAL_TWEETS_CHANNEL_ID = (() => {
  if (IS_PROD) return '';
  if (!process.env.DISCORD_LOCAL_TWEETS_CHANNEL_ID) {
    throw new Error('DISCORD_LOCAL_TWEETS_CHANNEL_ID is not set in your .env');
  }
  return process.env.DISCORD_LOCAL_TWEETS_CHANNEL_ID;
})();
export const TEMPERATURE = 0;
export const SEED = 69;
