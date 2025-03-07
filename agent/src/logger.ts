import pino from 'pino';

// Comment
export const logger = pino({
  name: 'agent',
  level: 'info',
});

export type WithLogger = typeof logger;
