import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/drivers/memory';
import { redisDriver } from 'bentocache/drivers/redis';
import { Redis } from 'ioredis';
import { REDIS_URI } from './const';

const redis = new Redis(REDIS_URI);

export const bento = new BentoCache({
  default: 'memstore',
  stores: {
    memstore: bentostore()
      .useL1Layer(memoryDriver())
      .useL2Layer(redisDriver({ connection: redis })),
  },
});
