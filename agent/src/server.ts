import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { serve } from 'inngest/fastify';
import { CoreMessage, smoothStream, StreamData, streamText, tool } from 'ai';
import * as crypto from 'node:crypto';
import cors from '@fastify/cors';
import {
  CF_TEAM_DOMAIN,
  DISCORD_TOKEN,
  IS_PROD,
  PRIVY_APP_ID,
  PRIVY_JWKS,
  SEED,
  TEMPERATURE,
  TWEET_EXTRACT_REGEX,
} from './const';
import { discordClient } from './discord/client';
import { reportFailureToDiscord } from './discord/action';
import {
  processTestEngageRequest,
  ProcessTestEngageRequestInput,
} from './api/test-engage';
import { createRemoteJWKSet, jwtVerify } from 'jose';
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
import { apiRequest, promClient, readiness } from './prom';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { inngest } from './inngest';
import { ingestTweets } from './twitter/ingest';
import { processTweets } from './twitter/process';
import { executeTweets } from './twitter/execute';
import { ingestInteractionTweets } from './twitter/ingest-interaction';
import { processInteractionTweets } from './twitter/process-interactions';
import { executeInteractionTweets } from './twitter/execute-interaction';
import { ingestTemporaryInteractionTweets } from './twitter/ingest-temporary';
import { createContext } from './trpc';
import { appRouter } from './router';
import { getSearchResult } from './twitter/web';
import { z } from 'zod';
import { UserChatStreamInput } from './api/user-chat';
import { PROMPTS } from './twitter/prompts';

const fastify = Fastify({ maxParamLength: 5000 });

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
  onResponse(request, reply) {
    apiRequest.inc({
      method: request.method,
      path: '/api/inngest',
    });
  },
  url: '/api/inngest',
});

fastify.register(cors, {
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'cf-authorization-token',
    'privy-token',
  ],
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
  origin: [
    'http://localhost:4321',
    'http://localhost:4322',
    'https://manage.dogeai.info',
    'https://dogeai.chat',
    /^https:\/\/([a-zA-Z0-9-]+\.)*dogeai-chat\.pages\.dev$/, // Matches dogeai-chat.pages.dev and subdomains
  ],
});

const authHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!IS_PROD) {
    return;
  }

  const log = logger.child({
    requestId: request.id,
  });
  const token = request.headers?.['cf-authorization-token'];
  const privyToken = request.headers?.['privy-token'];

  if (privyToken) {
    const JWKS = createRemoteJWKSet(new URL(PRIVY_JWKS));

    // Make sure that the incoming request has our token header
    if (!privyToken || typeof privyToken !== 'string') {
      log.error({}, 'missing required privy authorization token');
      return reply.status(403).send({
        status: false,
        message: 'missing required privy token',
      });
    }

    try {
      const result = await jwtVerify(privyToken, JWKS, {
        issuer: 'privy.io',
        audience: PRIVY_APP_ID,
      });
      log.info(
        { result: result.payload },
        'privy authorization token verified',
      );
      return;
    } catch (error) {
      log.error({ error }, 'invalid privy token');
      return reply.status(403).send({
        status: false,
        message: 'invalid privy token',
      });
    }
  }

  // Your CF Access team domain
  const CERTS_URL = `${CF_TEAM_DOMAIN}/cdn-cgi/access/certs`;
  const JWKS = createRemoteJWKSet(new URL(CERTS_URL));

  // Make sure that the incoming request has our token header
  if (!token || typeof token !== 'string') {
    log.error({}, 'missing required cf authorization token');
    return reply.status(403).send({
      status: false,
      message: 'missing required cf authorization token',
    });
  }

  try {
    const result = await jwtVerify(token, JWKS, {
      issuer: CF_TEAM_DOMAIN,
      // audience: CF_AUDIENCE, // TODO: need to find a better way for this
    });
    log.info({ result: result.payload }, 'cf authorization token verified');
  } catch (error) {
    log.error({ error }, 'invalid cf authorization token');
    return reply.status(403).send({
      status: false,
      message: 'invalid cf authorization token',
    });
  }
};

fastify.register(fastifyTRPCPlugin, {
  prefix: '/api/trpc',
  trpcOptions: {
    router: appRouter,
    createContext,
    onError({ path, error }) {
      logger.error(
        {
          error,
        },
        `Error in tRPC handler on path '${path}'`,
      );
    },
  },
});

fastify.route<{ Body: ProcessTestEngageRequestInput }>({
  method: 'POST',
  preHandler: [authHandler],
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
    apiRequest.inc({
      method: request.method,
      path: '/api/test/engage',
    });
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
  preHandler: [authHandler],
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
    apiRequest.inc({
      method: request.method,
      path: '/api/test/reply',
    });
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
  preHandler: [authHandler],
  schema: {
    body: ChatStreamInput,
  },
  handler: async (request, reply) => {
    apiRequest.inc({
      method: request.method,
      path: '/api/chat',
    });
    const log = logger.child({ function: 'api-chat', requestId: request.id });
    // Create an AbortController for the backend
    const abortController = new AbortController();
    let {
      billSearch,
      documentSearch,
      manualKbSearch,
      webSearch,
      messages,
      selectedChatModel,
    } = request.body as {
      documentSearch: boolean;
      manualKbSearch: boolean;
      webSearch: boolean;
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

      const extractedTweetUrl = userMessageText.match(TWEET_EXTRACT_REGEX);

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
            TWEET_EXTRACT_REGEX,
            `"${tweetText}"`,
          );
          log.info({ updatedMessage }, 'swap tweet url with extracted text');
          messages.pop();
          messages.push({ role: 'user', content: updatedMessage });
        }
      }

      if (billSearch || documentSearch || manualKbSearch || webSearch) {
        const latestMessage = messages[messages.length - 1];
        const convoHistory = messages.filter(
          message => message.role === 'user' || message.role === 'assistant',
        );

        const kb = await getKbContext(
          {
            messages: convoHistory,
            text: latestMessage.content.toString(),
            manualEntries: manualKbSearch,
            billEntries: billSearch,
            documentEntries: documentSearch,
          },
          log,
        );

        if (kb?.bill) {
          log.info(
            {
              id: kb.bill.id,
              title: kb.bill.title,
            },
            'bill found',
          );
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
          log.info({ summary }, 'summary');
          // want to insert the DB summary as the second last message in the context of messages.
          messages.splice(messages.length - 1, 0, {
            role: 'user',
            content: summary,
          });
        }

        const webSearchResults = webSearch
          ? // if the model is sonar or online, then don't do web search
            selectedChatModel.startsWith('sonar') ||
            selectedChatModel.includes('online')
            ? null
            : await getSearchResult(
                {
                  // latest message
                  messages: [messages[messages.length - 1]],
                },
                log,
              )
          : null;

        if (webSearchResults) {
          const webResult = webSearchResults
            .map(
              result =>
                `Title: ${result.title}\nURL: ${result.url}\n\n Published Date: ${result.publishedDate}\n\n Content: ${result.text}\n\n`,
            )
            .join('');
          const urls = webSearchResults.map(result => result.url);

          stream.append({ role: 'sources', content: urls });

          // want to insert the internet results summary as the second last message in the context of messages
          messages.splice(messages.length - 1, 0, {
            role: 'user',
            content: `Web search results:\n\n${webResult}`,
          });
        }
      }

      // if sonar models then need to merge
      if (selectedChatModel.startsWith('sonar')) {
        messages = mergeConsecutiveSameRole(messages);
      }

      const result = streamText({
        model: myProvider.languageModel(selectedChatModel), // Ensure this returns a valid model
        abortSignal: abortController.signal,
        messages,
        temperature: selectedChatModel.startsWith('o4') ? 1 : TEMPERATURE,
        seed: SEED,
        maxSteps: 5,
        experimental_generateMessageId: crypto.randomUUID,
        experimental_transform: smoothStream({}),
        experimental_telemetry: { isEnabled: true, functionId: 'stream-text' },
        onError(error) {
          log.error({ error }, 'Error in chat stream');
        },
        async onFinish(event) {
          if (event.sources.length === 0) {
            log.info({}, 'no sources');
            await stream.close();
            return;
          }
          const sources = event.sources;
          log.info({ sources }, 'sources');

          const urls = sources.map(source => source.url);

          if (urls) {
            stream.append({ role: 'sources', content: urls });
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

fastify.route<{ Body: UserChatStreamInput }>({
  method: 'post',
  bodyLimit: 10485760, // 10MB
  preHandler: [authHandler],
  schema: {
    body: UserChatStreamInput,
  },
  handler: async (request, reply) => {
    apiRequest.inc({
      method: request.method,
      path: '/api/userchat',
    });
    const log = logger.child({
      function: 'api-userchat',
      requestId: request.id,
    });
    // Create an AbortController for the backend
    const abortController = new AbortController();
    let { messages, selectedChatModel } = request.body as {
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

      const extractedTweetUrl = userMessageText.match(TWEET_EXTRACT_REGEX);

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
            TWEET_EXTRACT_REGEX,
            `"${tweetText}"`,
          );
          log.info({ updatedMessage }, 'swap tweet url with extracted text');
          messages.pop();
          messages.push({ role: 'user', content: updatedMessage });
        }
      }

      const kb = await getKbContext(
        {
          messages,
          // latest message
          text: messages[messages.length - 1].content.toString(),
          manualEntries: true,
          billEntries: false,
          documentEntries: false,
        },
        log,
      );

      if (kb.manualEntries) {
        let result = 'Knowledge base entries:\n';
        result += kb.manualEntries;
        result += '\n\n';
        // inject to second last message
        messages.splice(messages.length - 1, 0, {
          role: 'user',
          content: result.trim(),
        });
        stream.appendMessageAnnotation({
          role: 'kb-entry-found',
        });
      }

      const systemPrompt = messages.find(message => message.role === 'system');

      if (!systemPrompt) {
        const prompt = await PROMPTS.CHAT_INTERFACE_SYSTEM_PROMPT();
        messages.unshift({
          role: 'system',
          content: `${prompt}.\nCurrent date: ${new Date().toUTCString()}`,
        });
      }

      const result = streamText({
        model: myProvider.languageModel(selectedChatModel), // Ensure this returns a valid model
        abortSignal: abortController.signal,
        messages,
        experimental_transform: smoothStream({}),
        temperature: selectedChatModel.startsWith('o4') ? 1 : TEMPERATURE,
        seed: SEED,
        tools: {
          web: tool({
            description: 'Browse the web',
            parameters: z.object({
              query: z.string(),
            }),
            execute: async ({ query }) => {
              log.info({ query }, 'query for web tool call');
              const webSearchResults = await getSearchResult(
                {
                  messages: [
                    {
                      role: 'user',
                      content: query,
                    },
                  ],
                },
                log,
              );

              if (webSearchResults) {
                const webResult = webSearchResults
                  .map(
                    result =>
                      `Title: ${result.title}\nURL: ${result.url}\n\n Published Date: ${result.publishedDate}\n\n Content: ${result.text}\n\n`,
                  )
                  .join('');
                const urls = webSearchResults.map(result => result.url);

                stream.append({ role: 'sources', content: urls });

                return webResult;
              }

              return null;
            },
          }),
          bill: tool({
            description: 'Get Bill from Congress',
            parameters: z.object({
              query: z.string(),
            }),
            execute: async ({ query }) => {
              const kb = await getKbContext(
                {
                  messages: messages,
                  text: query,
                  manualEntries: false,
                  billEntries: true,
                  documentEntries: false,
                },
                log,
              );

              if (kb?.bill) {
                return kb.bill;
              }

              return null;
            },
          }),
        },
        maxSteps: 5,
        experimental_generateMessageId: crypto.randomUUID,
        experimental_telemetry: { isEnabled: true, functionId: 'stream-text' },
        onError(error) {
          log.error({ error }, 'Error in chat stream');
        },
        async onFinish(event) {
          if (event.sources.length === 0) {
            await stream.close();
            log.info({}, 'stream closed');
            return;
          }
          const sources = event.sources;
          log.info({ sources }, 'sources');

          const urls = sources.map(source => source.url);

          if (urls) {
            stream.append({ role: 'sources', content: urls });
          }
          log.info({}, 'stream closed');
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
  url: '/api/userchat',
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
