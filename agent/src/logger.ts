import pino from 'pino';

export const logger = pino({
  name: 'agent',
  level: 'info',
});

export const chatLogger = pino({
  name: 'chat',
  level: 'info',
});

export type WithLogger = typeof logger;
