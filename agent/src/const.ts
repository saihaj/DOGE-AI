function getEnvKey(key: string): string {
  const value = process.env?.[key];
  if (!value) {
    throw new Error(`${key} is not set in your .env`);
  }
  return value;
}
if (!process.env.PERPLEXITY_API_KEY) {
  throw new Error('PERPLEXITY_API_KEY is not set in your .env');
}
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in your .env');
}
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set in your .env');
}
export const OPENAI_API_KEY = (() => {
  return getEnvKey('OPENAI_API_KEY');
})();
export const TWITTER_API_KEY = (() => {
  return getEnvKey('TWITTER_IO_API_KEY');
})();
export const TWITTER_USERNAME = (() => {
  return getEnvKey('TWITTER_USERNAME');
})();
export const MAX_TWEET_LENGTH = 280;
export const TWITTER_API_BASE_URL = 'https://api.twitterapi.io';
/**
 * Various error messages we use in the agent.
 */
export const REJECTION_REASON = {
  ENGAGEMENT_RESTRICTED_ACCOUNT: 'ENGAGEMENT_RESTRICTED_ACCOUNT',
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
  MAX_THREAD_DEPTH_REACHED: 'MAX_THREAD_DEPTH_REACHED',
  NO_TWEET_FOUND_TO_REPLY_TO: 'NO_TWEET_FOUND_TO_REPLY_TO',
  NO_BILL_ID_FOUND: 'NO_BILL_ID_FOUND',
  NO_BILL_FOUND: 'NO_BILL_FOUND',
  WOKE_REPLY_NOT_REWRITTEN: 'WOKE_REPLY_NOT_REWRITTEN',
  NO_TAG_ENGAGEMENT_TO_OWN_REPLY: 'NO_TAG_ENGAGEMENT_TO_OWN_REPLY',
} as const;
export const DISCORD_TOKEN = (() => {
  return getEnvKey('DISCORD_TOKEN');
})();
export const DISCORD_APPROVED_CHANNEL_ID = (() => {
  return getEnvKey('DISCORD_APPROVED_CHANNEL_ID');
})();
export const DISCORD_REJECTED_CHANNEL_ID = (() => {
  return getEnvKey('DISCORD_REJECTED_CHANNEL_ID');
})();
export const DISCORD_SERVER_ID = (() => {
  return getEnvKey('DISCORD_SERVER_ID');
})();
export const DISCORD_ERROR_LOG_CHANNEL_ID = (() => {
  return getEnvKey('DISCORD_ERROR_LOG_CHANNEL_ID');
})();
export const TWITTER_APP_KEY = (() => {
  return getEnvKey('TWITTER_APP_KEY');
})();
export const TWITTER_APP_SECRET = (() => {
  return getEnvKey('TWITTER_APP_SECRET');
})();
export const TWITTER_ACCESS_TOKEN = (() => {
  return getEnvKey('TWITTER_ACCESS_TOKEN');
})();
export const TWITTER_ACCESS_SECRET = (() => {
  return getEnvKey('TWITTER_ACCESS_SECRET');
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
export const ACTIVE_CONGRESS = 119;
export const MANUAL_KB_AGENT_SOURCE = 'manual-kb';
export const MANUAL_KB_CHAT_SOURCE = 'chat-manual-kb';
export const WEB_SOURCE = 'web';
export const CF_AUDIENCE = (() => {
  if (!IS_PROD) return '';
  if (!process.env.CF_AUDIENCE) {
    throw new Error('CF_AUDIENCE is not set in your .env');
  }
  return process.env.CF_AUDIENCE;
})();
export const CF_TEAM_DOMAIN = (() => {
  if (!IS_PROD) return '';
  if (!process.env.CF_TEAM_DOMAIN) {
    throw new Error('CF_TEAM_DOMAIN is not set in your .env');
  }
  return process.env.CF_TEAM_DOMAIN;
})();
export const VECTOR_SEARCH_MATCH_THRESHOLD = 0.6;
export const TWEET_EXTRACT_REGEX = /https?:\/\/(x\.com|twitter\.com)\/[^\s]+/i;
export const OPEN_ROUTER_API_KEY = (() => {
  return getEnvKey('OPEN_ROUTER_API_KEY');
})();
export const EXA_API_KEY = (() => {
  return getEnvKey('EXA_API_KEY');
})();
export const DEEPINFRA_API_KEY = (() => {
  return getEnvKey('DEEPINFRA_API_KEY');
})();
export const PRIVY_JWKS = (() => {
  if (!IS_PROD) return '';
  if (!process.env.PRIVY_JWKS) {
    throw new Error('PRIVY_JWKS is not set in your .env');
  }
  return process.env.PRIVY_JWKS;
})();
export const PRIVY_APP_ID = (() => {
  return getEnvKey('PRIVY_APP_ID');
})();
export const CHAT_TURSO_DATABASE_URL = (() => {
  return getEnvKey('CHAT_TURSO_DATABASE_URL');
})();
export const CHAT_TURSO_AUTH_TOKEN = (() => {
  return getEnvKey('CHAT_TURSO_AUTH_TOKEN');
})();
export const CHAT_REDIS_URL = (() => {
  return getEnvKey('CHAT_REDIS_URL');
})();
export const CHAT_OPENAI_API_KEY = (() => {
  return getEnvKey('CHAT_OPENAI_API_KEY');
})();
export const CHAT_EXA_API_KEY = (() => {
  return getEnvKey('CHAT_EXA_API_KEY');
})();
/**
 * Should be more than enough for most the bills.
 * We use this to use summary for really large bills so we don't waste too much time in our search like H.R. 1 (2025)
 *
 * more context: https://grok.com/share/bGVnYWN5_6d2794ed-0293-4402-8ec6-3d921de392aa
 */
export const LARGE_BILL_LENGTH_THRESHOLD = 200_000;
export const DEMO_SECRET_API_KEY = (() => {
  return getEnvKey('DEMO_SECRET_API_KEY');
})();
export const TURSO_PLATFORM_API_TOKEN = (() => {
  return getEnvKey('TURSO_PLATFORM_API_TOKEN');
})();
export const TURSO_PLATFORM_ORG_NAME = (() => {
  return getEnvKey('TURSO_PLATFORM_ORG_NAME');
})();
export const CONTROLPLANE_TURSO_DATABASE_URL = (() => {
  return getEnvKey('CONTROLPLANE_TURSO_DATABASE_URL');
})();
export const CONTROLPLANE_TURSO_AUTH_TOKEN = (() => {
  return getEnvKey('CONTROLPLANE_TURSO_AUTH_TOKEN');
})();
export const CDNYC_TURSO_DATABASE_URL = (() => {
  return getEnvKey('CDNYC_TURSO_DATABASE_URL');
})();
export const CDNYC_TURSO_AUTH_TOKEN = (() => {
  return getEnvKey('CDNYC_TURSO_AUTH_TOKEN');
})();
export const DISCORD_CDNYC_APPROVED_CHANNEL_ID = (() => {
  return getEnvKey('DISCORD_CDNYC_APPROVED_CHANNEL_ID');
})();
export const DISCORD_CDNYC_REJECTED_CHANNEL_ID = (() => {
  return getEnvKey('DISCORD_CDNYC_REJECTED_CHANNEL_ID');
})();
export const CDNYC_X_ACCESS_TOKEN = (() => {
  return getEnvKey('CDNYC_X_ACCESS_TOKEN');
})();
export const CDNYC_X_ACCESS_SECRET = (() => {
  return getEnvKey('CDNYC_X_ACCESS_SECRET');
})();
export const X_CONSUMER_TOKEN = (() => {
  return getEnvKey('X_CONSUMER_TOKEN');
})();
export const X_CONSUMER_SECRET = (() => {
  return getEnvKey('X_CONSUMER_SECRET');
})();
