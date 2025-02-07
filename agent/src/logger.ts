import pino from 'pino';

export const logger = pino({
  name: 'agent',
  level: 'info',
});
