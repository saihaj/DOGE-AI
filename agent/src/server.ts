import { serve } from 'inngest/fastify';
import Fastify from 'fastify';
import { inngest } from './inngest';
import { ingestTweets } from './twitter/ingest';
import { processTweets } from './twitter/process';
import { executeTweets } from './twitter/execute';
import { DISCORD_TOKEN } from './const';
import { discordClient } from './discord/client';
import { reportFailureToDiscord } from './discord/action';
import { ingestInteractionTweets } from './twitter/ingest-interaction';
import { processInteractionTweets } from './twitter/process-interactions';
import { executeInteractionTweets } from './twitter/execute-interaction';
import { processTestRequest } from './web/test-handler';

const fastify = Fastify();

fastify.route({
  method: ['GET', 'POST', 'PUT'],
  handler: serve({
    client: inngest,
    functions: [
      ingestTweets,
      processTweets,
      executeTweets,
      ingestInteractionTweets,
      processInteractionTweets,
      executeInteractionTweets,
    ],
  }),
  url: '/api/inngest',
});

fastify.route({
  method: 'POST',
  handler: async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'POST');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');

    try {
      // @ts-ignore
      const { tweetUrl, mainPrompt, refinePrompt } = request.body;
      const { answer, short } = await processTestRequest(tweetUrl, mainPrompt, refinePrompt);
      reply.send({ success: true, answer, short });
    } catch (error) {
      console.error('Test error:', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
  url: '/api/test-bot',
});

fastify.route({
  method: 'OPTIONS',
  url: '/api/test-bot',
  handler: (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'POST');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');
    reply.send();
  },
});

// So in fly.io, health should do both the health check and the readiness check
fastify.route({
  method: 'GET',
  handler: async (request, reply) => {
    if (discordClient.isReady()) {
      return reply.send({ status: 'ready' }).code(200);
    } else {
      return reply.send({ status: 'not ready' }).code(503);
    }
  },
  url: '/api/health',
});

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
    console.error(err);
    process.exit(1);
  }
});
