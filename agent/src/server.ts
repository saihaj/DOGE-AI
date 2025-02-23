import { serve } from 'inngest/fastify';
import Fastify from 'fastify';
import {
  createDataStreamResponse,
  experimental_customProvider,
  streamText,
  type Message,
} from 'ai';
import { inngest } from './inngest';
import * as crypto from 'node:crypto';
import cors from '@fastify/cors';
import { ingestTweets } from './twitter/ingest';
import { processTweets } from './twitter/process';
import { executeTweets } from './twitter/execute';
import { DISCORD_TOKEN } from './const';
import { discordClient } from './discord/client';
import { reportFailureToDiscord } from './discord/action';
import { ingestInteractionTweets } from './twitter/ingest-interaction';
import { processInteractionTweets } from './twitter/process-interactions';
import { executeInteractionTweets } from './twitter/execute-interaction';
import { ingestTemporaryInteractionTweets } from './twitter/ingest-temporary';
import {
  processTestEngageRequest,
  ProcessTestEngageRequestInput,
} from './api/test-engage';
import {
  processTestReplyRequest,
  ProcessTestReplyRequestInput,
} from './api/test-reply';
import { logger } from './logger';
import { Static, Type } from '@sinclair/typebox';
import { openai } from '@ai-sdk/openai';
import { perplexity } from '@ai-sdk/perplexity';

const fastify = Fastify();

fastify.register(cors, {
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'OPTIONS'],
  origin: ['http://localhost:4321', 'https://manage.dogeai.info'],
});

fastify.route({
  method: ['GET', 'POST', 'PUT'],
  handler: serve({
    client: inngest,
    functions: [
      ingestTweets,
      processTweets,
      executeTweets,
      ingestInteractionTweets,
      ingestTemporaryInteractionTweets,
      processInteractionTweets,
      executeInteractionTweets,
    ],
  }),
  url: '/api/inngest',
});

fastify.route<{ Body: ProcessTestEngageRequestInput }>({
  method: 'POST',
  schema: {
    body: ProcessTestEngageRequestInput,
    response: {
      200: {
        type: 'object',
        properties: {
          answer: { type: 'string' },
          short: { type: 'string' },
          bill: { type: 'string' },
          metadata: { type: ['string', 'null'] },
        },
      },
    },
  },
  handler: async (request, reply) => {
    try {
      const { tweetId, mainPrompt, refinePrompt } = request.body;
      const result = await processTestEngageRequest({
        tweetId,
        mainPrompt,
        refinePrompt,
      });

      return reply.send(result);
    } catch (error) {
      console.error('Test error:', error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
  url: '/api/test/engage',
});

fastify.route<{ Body: ProcessTestReplyRequestInput }>({
  method: 'POST',
  schema: {
    body: ProcessTestReplyRequestInput,
    response: {
      200: {
        type: 'object',
        properties: {
          answer: { type: 'string' },
          short: { type: 'string' },
          bill: { type: 'string' },
        },
      },
    },
  },
  handler: async (request, reply) => {
    try {
      const { tweetId, mainPrompt, refinePrompt } = request.body;
      const result = await processTestReplyRequest({
        tweetId,
        mainPrompt,
        refinePrompt,
      });

      return reply.send(result);
    } catch (error) {
      console.error('Test error:', error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
  url: '/api/test/reply',
});

const ChatStreamInput = Type.Object({
  id: Type.String(),
  messages: Type.Array(Type.Any()),
  selectedChatModel: Type.String(),
});
type ChatStreamInput = Static<typeof ChatStreamInput>;

const myProvider = experimental_customProvider({
  languageModels: {
    'sonar-reasoning-pro': perplexity('sonar-reasoning-pro'),
    'sonar-reasoning': perplexity('sonar-reasoning'),
    'o3-mini': openai('o3-mini'),
    'gpt-4o': openai('gpt-4o'),
  },
});

fastify.route<{ Body: ChatStreamInput }>({
  method: 'post',
  schema: {
    body: ChatStreamInput,
  },
  handler: async (request, reply) => {
    // Create an AbortController for the backend
    const abortController = new AbortController();
    const { id, messages, selectedChatModel } = request.body;

    // Listen for the client disconnecting (abort)
    request.raw.on('close', () => {
      if (request.raw.aborted) {
        abortController.abort();
      }
    });

    // Mark the response as a v1 data stream:
    reply.header('X-Vercel-AI-Data-Stream', 'v1');
    reply.header('Content-Type', 'text/plain; charset=utf-8');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Connection', 'keep-alive');
    reply.type('text/event-stream');

    try {
      const result = streamText({
        model: myProvider.languageModel(selectedChatModel), // Ensure this returns a valid model
        abortSignal: abortController.signal,
        messages,
        maxSteps: 5,
        experimental_generateMessageId: crypto.randomUUID,
        experimental_telemetry: { isEnabled: true, functionId: 'stream-text' },
      });

      reply.type('text/event-stream');
      reply.header('X-Vercel-AI-Data-Stream', 'v1');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');

      // Use toDataStreamResponse for simplicity
      const response = result.toDataStreamResponse();
      return response;
    } catch (error) {
      if (abortController.signal.aborted) {
        // Handle the abort gracefully
        reply.status(204).send(); // No Content
        return;
      }

      throw error; // Other errors should be handled as usual
    }
  },
  url: '/api/chat',
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
  logger.info({}, `Server listening on ${address}`);

  try {
    await discordClient.login(DISCORD_TOKEN);
    logger.info({ user: discordClient.user }, 'Logged into Discord');
  } catch (e) {
    console.error('Failed to login to Discord:', e);
  }

  if (err) {
    await reportFailureToDiscord({ message: 'Agent server crashes: ' + err });
    logger.error(
      {
        error: err,
      },
      'Agent server crashed',
    );
    process.exit(1);
  }
});
