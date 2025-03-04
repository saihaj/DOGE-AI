import { serve } from 'inngest/fastify';
import Fastify from 'fastify';
import { CoreMessage, StreamData, streamText } from 'ai';
import { inngest } from './inngest';
import * as crypto from 'node:crypto';
import cors from '@fastify/cors';
import { ingestTweets } from './twitter/ingest';
import { processTweets } from './twitter/process';
import { executeTweets } from './twitter/execute';
import { DISCORD_TOKEN, SEED, TEMPERATURE } from './const';
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
import { ChatStreamInput, myProvider } from './api/chat';
import { logger } from './logger';
import { getKbContext } from './twitter/knowledge-base';
import {
  getTweetContentAsText,
  mergeConsecutiveSameRole,
} from './twitter/helpers';
import { promClient, readiness } from './prom';
import {
  getKbEntries,
  ManualKbGetInput,
  ManualKBInsertInput,
  postKbInsert,
} from './api/manual-kb';

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

fastify.route<{ Body: ChatStreamInput }>({
  method: 'post',
  schema: {
    body: ChatStreamInput,
  },
  handler: async (request, reply) => {
    const tweetExtractRegex = /https?:\/\/(x\.com|twitter\.com)\/[^\s]+/i;
    const log = logger.child({ function: 'api-chat' });
    // Create an AbortController for the backend
    const abortController = new AbortController();
    let {
      billSearch,
      documentSearch,
      manualKbSearch,
      messages,
      selectedChatModel,
    } = request.body as {
      documentSearch: boolean;
      manualKbSearch: boolean;
      billSearch: boolean;
      messages: CoreMessage[];
      selectedChatModel: string;
    };
    const userMessage = messages[messages.length - 1];

    if (!userMessage) {
      throw new Error('No user message');
    }

    const userMessageText = userMessage.content.toString();

    log.info({ text: userMessageText }, 'User message');

    // Listen for the client disconnecting (abort)
    request.raw.on('close', () => {
      if (request.raw.aborted) {
        abortController.abort();
      }
    });

    // Mark the response as a v1 data stream:
    reply.header('Content-Type', 'text/plain; charset=utf-8');
    reply.type('text/event-stream');
    reply.header('X-Vercel-AI-Data-Stream', 'v1');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Connection', 'keep-alive');

    try {
      const stream = new StreamData();

      const extractedTweetUrl = userMessageText.match(tweetExtractRegex);

      let tweetUrl: string | null = null;
      if (extractedTweetUrl) {
        tweetUrl = extractedTweetUrl[0];
        log.info({ url: tweetUrl }, 'extracted tweet');
        const url = new URL(tweetUrl);
        const tweetId = url.pathname.split('/').pop();
        log.info({ tweetId }, 'tweetId');

        if (tweetId) {
          const tweetText = await getTweetContentAsText({ id: tweetId }, log);
          stream.append({
            role: 'tweet',
            content: tweetText,
          });
          const updatedMessage = userMessageText.replace(
            tweetExtractRegex,
            `"${tweetText}"`,
          );
          log.info({ updatedMessage }, 'swap tweet url with extracted text');
          messages.pop();
          messages.push({ role: 'user', content: updatedMessage });
        }
      }

      if (billSearch || documentSearch || manualKbSearch) {
        const latestMessage = messages[messages.length - 1];
        const kb = await getKbContext(
          {
            messages: messages,
            text: latestMessage.content.toString(),
            manualEntries: manualKbSearch,
            billEntries: billSearch,
            documentEntries: documentSearch,
          },
          log,
        );

        if (kb?.bill) {
          log.info(kb.bill, 'bill found');
        }

        const bill = kb?.bill ? `${kb.bill.title}: \n\n${kb.bill.content}` : '';
        const summary = (() => {
          let result = ' ';

          if (kb.manualEntries) {
            result += 'Knowledge base entries:\n';
            result += kb.manualEntries;
            result += '\n\n';
          }

          if (kb.documents) {
            result += kb.documents;
            result += '\n\n';
          }

          if (bill) {
            result += bill;
            result += '\n\n';
          }

          return result.trim();
        })();

        if (summary) {
          // want to insert the DB summary as the second last message in the context of messages.
          messages.splice(messages.length - 1, 0, {
            role: 'user',
            content: summary,
          });

          log.info({ messages }, 'messages with summary');
        }
      }

      // if sonar models then need to merge
      if (
        selectedChatModel === 'sonar-reasoning-pro' ||
        selectedChatModel === 'sonar-reasoning'
      ) {
        messages = mergeConsecutiveSameRole(messages);
      }

      const result = streamText({
        model: myProvider.languageModel(selectedChatModel), // Ensure this returns a valid model
        abortSignal: abortController.signal,
        messages,
        temperature: TEMPERATURE,
        seed: SEED,
        maxSteps: 5,
        experimental_generateMessageId: crypto.randomUUID,
        experimental_telemetry: { isEnabled: true, functionId: 'stream-text' },
        async onFinish(event) {
          if (!event.experimental_providerMetadata) {
            log.info({}, 'no providerMetadata');
            await stream.close();
            return;
          }
          const providerMetadata = event.experimental_providerMetadata;
          log.info({ providerMetadata }, 'providerMetadata');

          const pplxSources = providerMetadata.perplexity?.citations;

          if (pplxSources) {
            stream.append({ role: 'sources', content: pplxSources });
          }
          await stream.close();
        },
      });

      // Use toDataStreamResponse for simplicity
      const response = result.toDataStreamResponse({
        sendReasoning: true,
        sendUsage: true,
        data: stream,
      });

      return response;
    } catch (error) {
      log.error({ error }, 'Error in chat stream');
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

fastify.route<{ Body: ManualKBInsertInput }>({
  method: 'POST',
  schema: {
    body: ManualKBInsertInput,
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
  },
  handler: async (request, reply) => {
    const log = logger.child({
      requestId: request.id,
    });
    try {
      const { title, content } = request.body;

      if (!title) {
        log.error(
          {
            body: request.body,
          },
          'title is required',
        );
        reply.code(400).send({ success: false, error: 'Title is required' });
      }

      if (!content) {
        log.error(
          {
            body: request.body,
          },
          'content is required',
        );
        reply.code(400).send({ success: false, error: 'Content is required' });
      }
      const result = await postKbInsert(
        {
          title,
          content,
        },
        log,
      );

      return reply.send(result);
    } catch (error) {
      log.error({ error }, 'Error in postKbInsert');
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
  url: '/api/manual-kb',
});

fastify.route<{ Querystring: ManualKbGetInput }>({
  method: 'GET',
  schema: {
    querystring: ManualKbGetInput,
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
          },
        },
      },
    },
  },
  handler: async (request, reply) => {
    const log = logger.child({
      requestId: request.id,
    });
    try {
      const { page, limit } = request.query;

      if (!page) {
        log.error(
          {
            body: request.body,
          },
          'page is required',
        );
        reply.code(400).send({ success: false, error: 'page is required' });
      }

      if (page < 0) {
        log.error(
          {
            body: request.body,
          },
          'page should be greater than 0',
        );
        reply.code(400).send({
          success: false,
          error: 'page should be greater than or equal to 0',
        });
      }

      if (!limit) {
        log.error(
          {
            body: request.body,
          },
          'limit is required',
        );
        reply.code(400).send({ success: false, error: 'limit is required' });
      }

      if (limit < 0) {
        log.error(
          {
            body: request.body,
          },
          'limit should be greater than 0',
        );
        reply.code(400).send({
          success: false,
          error: 'limit should be greater than or equal to 0',
        });
      }

      if (limit > 30) {
        log.error(
          {
            body: request.body,
          },
          'limit should be less than 30',
        );
        reply.code(400).send({
          success: false,
          error: 'limit should be less than or equal to 30',
        });
      }

      const result = await getKbEntries({
        page,
        limit,
      });

      return reply.send(result);
    } catch (error) {
      log.error({ error }, 'Error in getKbEntries');
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
  url: '/api/manual-kb',
});

// So in fly.io, health should do both the health check and the readiness check
fastify.route({
  method: 'GET',
  handler: async (request, reply) => {
    const status = discordClient.isReady();
    readiness.set(status ? 1 : 0);
    if (status) {
      return reply.send({ status: 'ready' }).code(200);
    } else {
      return reply.send({ status: 'not ready' }).code(503);
    }
  },
  url: '/api/health',
});

fastify.route({
  method: 'GET',
  handler: async (_, reply) => {
    reply.header('Content-Type', promClient.register.contentType);
    reply.send(await promClient.register.metrics());
  },
  url: '/api/metrics',
});

fastify.listen({ host: '0.0.0.0', port: 3000 }, async function (err, address) {
  logger.info({}, `Server listening on ${address}`);
  promClient.collectDefaultMetrics({
    labels: {
      app: 'agent',
    },
  });

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
