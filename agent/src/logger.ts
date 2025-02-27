import pino from 'pino';
import type { LokiOptions } from 'pino-loki';
import { IS_PROD, LOKI_ENDPOINT, LOKI_PASSWORD, LOKI_USERNAME } from './const';

const transport = pino.transport<LokiOptions>({
  target: 'pino-loki',
  level: 'info',
  options: {
    batching: true,
    interval: 5,
    labels: {
      name: 'agent',
    },
    host: LOKI_ENDPOINT,
    basicAuth: {
      username: LOKI_USERNAME,
      password: LOKI_PASSWORD,
    },
  },
});

export const logger = pino(
  IS_PROD
    ? transport
    : {
        name: 'agent',
        level: 'info',
      },
);

export type WithLogger = typeof logger;
