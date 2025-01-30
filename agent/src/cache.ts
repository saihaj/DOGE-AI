import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/drivers/memory';

export const bento: BentoCache<{ memstore: ReturnType<typeof bentostore> }> =
  new BentoCache({
    default: 'memstore',
    stores: {
      memstore: bentostore().useL1Layer(memoryDriver()),
    },
  });
