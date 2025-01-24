import dotenv from 'dotenv';

dotenv.config();

export const DISCORD_TOKEN = (() => {
  if (!process.env.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN is not set');
  }
  return process.env.DISCORD_TOKEN;
})();

export const PORT = (() => {
  if (!process.env.PORT) {
    throw new Error('PORT is not set');
  }
  return process.env.PORT;
})();

export const SERVER_ID = (() => {
  if (!process.env.SERVER_ID) {
    throw new Error('SERVER_ID is not set in your .env');
  }
  return process.env.SERVER_ID;
})();

export const APPROVED_CHANNEL_ID = (() => {
  if (!process.env.APPROVED_CHANNEL_ID) {
    throw new Error('APPROVED_CHANNEL_ID is not set in your .env');
  }
  return process.env.APPROVED_CHANNEL_ID;
})();

export const REJECTED_CHANNEL_ID = (() => {
  if (!process.env.REJECTED_CHANNEL_ID) {
    throw new Error('REJECTED_CHANNEL_ID is not set in your .env');
  }
  return process.env.REJECTED_CHANNEL_ID;
})();

export const MAX_TWEET_LENGTH = 280;
