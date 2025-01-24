import { serve } from 'inngest/fastify';
import Fastify from 'fastify';
import { inngest } from './inngest';
import { ingestTweets } from './twitter/ingest';
import { processTweets } from './twitter/process';
import { executeTweets } from './twitter/execute';

const fastify = Fastify();

fastify.route({
  method: ['GET', 'POST', 'PUT'],
  handler: serve({
    client: inngest,
    functions: [ingestTweets, processTweets, executeTweets],
  }),
  url: '/api/inngest',
});

fastify.listen({ host: '0.0.0.0', port: 3000 }, function (err, address) {
  console.log(`Server listening on ${address}`);
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
