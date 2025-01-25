import { serve } from 'inngest/fastify';
import Fastify from 'fastify';
import { inngest } from './inngest';
import { ingestTweets } from './twitter/ingest';
import { processTweets } from './twitter/process';
import { executeTweets } from './twitter/execute';
import { DISCORD_TOKEN } from './const';
import { discordClient } from './discord/client';
import { reportFailureToDiscord } from './discord/action';

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
    await discordClient.login(DISCORD_TOKEN);
    console.log(`Logged into Discord as ${discordClient.user?.tag}`);
  } catch (e) {
    console.error('Failed to login to Discord:', e);
  }

  if (err) {
    await reportFailureToDiscord({ message: 'Agent server crashes: ' + err });
    fastify.log.error(err);
    process.exit(1);
  }
});
