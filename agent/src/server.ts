import { serve } from 'inngest/fastify';
import Fastify from 'fastify';
import { inngest } from './inngest';
import { ingestTweets } from './twitter/ingest';
import { processTweets } from './twitter/process';
import { executeTweets } from './twitter/execute';
import {
  twitter,
  TWITTER_2FA_SECRET,
  TWITTER_EMAIL,
  TWITTER_PASSWORD,
  TWITTER_USERNAME,
} from './const';

const fastify = Fastify();

fastify.route({
  method: ['GET', 'POST', 'PUT'],
  handler: serve({
    client: inngest,
    functions: [ingestTweets, processTweets, executeTweets],
  }),
  url: '/api/inngest',
});

try {
} catch (e) {
  console.error('Failed to login to Twitter:', e);
}

fastify.listen({ host: '0.0.0.0', port: 3000 }, async function (err, address) {
  console.log(`Server listening on ${address}`);

  await twitter.login(
    TWITTER_USERNAME,
    TWITTER_PASSWORD,
    TWITTER_EMAIL,
    TWITTER_2FA_SECRET,
  );

  const cookies = await twitter.getCookies();
  console.log(JSON.stringify(cookies));
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
