import pino from 'pino';

// Create a logger instance
export const logger = pino({
  name: 'agent',
  level: 'info',
});

export type WithLogger = typeof logger;
