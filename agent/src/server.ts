import { serve } from 'inngest/fastify';
import Fastify from 'fastify';
import { inngest } from './inngest';
import { ingestTweets } from './twitter/ingest';
import { processTweets } from './twitter/process';
import { executeTweets } from './twitter/execute';
import {
  DISCORD_TOKEN,
  twitter,
  TWITTER_2FA_SECRET,
  TWITTER_EMAIL,
  TWITTER_PASSWORD,
  TWITTER_USERNAME,
} from './const';
import { client } from './discord/client';

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

  try {
    const discord = await client.login(DISCORD_TOKEN);
    console.log(`Logged into Discord as ${discord.user?.tag}`);
  } catch (e) {
    console.error('Failed to login to Discord:', e);
  }

  try {
    await twitter.login(
      TWITTER_USERNAME,
      TWITTER_PASSWORD,
      TWITTER_EMAIL,
      TWITTER_2FA_SECRET,
    );
    const cookies = await twitter.getCookies();
    console.log(JSON.stringify(cookies));
  } catch (err) {
    console.error('Failed to login to Twitter:', err);
  }

  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
