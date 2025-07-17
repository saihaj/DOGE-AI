import cors from '@fastify/cors';
import { Static, Type } from '@sinclair/typebox';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import {
  appendClientMessage,
  appendResponseMessages,
  CoreMessage,
  smoothStream,
  StreamData,
  streamText,
  UIMessage,
} from 'ai';
import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { Redis } from 'ioredis';
import * as crypto from 'node:crypto';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import {
  contextUser,
  DAILY_MESSAGE_LIMIT_DEFUALT,
  jwtSchema,
} from './chat-api/context';
import { ChatSDKError } from './chat-api/errors';
import {
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from './chat-api/queries';
import { appRouter } from './chat-api/router';
import { createContext } from './chat-api/trpc';
import {
  CHAT_OPENAI_API_KEY,
  CHAT_REDIS_URL,
  DEMO_SECRET_API_KEY,
  IS_PROD,
  OPENAI_API_KEY,
  PRIVY_APP_ID,
  SEED,
  TEMPERATURE,
} from './const';
import { reportFailureToDiscord } from './discord/action';
import { chatLogger } from './logger';
import {
  apiRequest,
  promClient,
  userMessageRateLimitHits,
  userMessageUsage,
} from './prom';
import { getKbContext } from './twitter/knowledge-base';
import { PROMPTS } from './twitter/prompts';
import {
  extractAndProcessTweet,
  generateTitleFromUserMessage,
} from './utils/message-processing';
import {
  normalizeHeaderValue,
  setRateLimitHeaders,
  setStreamHeaders,
} from './utils/stream';
import { getChatTools } from './utils/tools';
import { createOpenAI } from '@ai-sdk/openai';
import { getSearchResult } from './twitter/web';
import { mergeConsecutiveSameRole } from './twitter/helpers';
import { myProvider } from './api/chat';

const fastify = Fastify({ maxParamLength: 5000 });

let redisClient: Redis;

const openai = createOpenAI({
  apiKey: CHAT_OPENAI_API_KEY,
  compatibility: 'strict',
});

fastify.register(cors, {
  allowedHeaders: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
  origin: [
    'http://localhost:4322',
    'http://localhost:8787',
    'http://localhost:3000',
    'https://dogeai.chat',
    'https://rhetor.ai',
    /^https:\/\/([a-zA-Z0-9-]+)*dogeai-terminal\.saihaj\.workers\.dev$/, // Matches dogeai-terminal.saihaj.workers.dev and subdomains
  ],
});

// Interface for the auth object
type AuthContext = {
  privyUserId: string;
  user: Awaited<ReturnType<typeof contextUser>>;
  rateLimiter: InstanceType<typeof RateLimiterRedis>;
};

const DURATION = 24 * 60 * 60; // 24 hours

function createRateLimiter({
  userId,
  perDayLimit,
}: {
  userId: string;
  perDayLimit: number;
}) {
  // This way we can ensure that rate limit reset every night at 00:00 UTC
  const todayDateUTC = new Date(Date.now()).toISOString().split('T')[0];

  if (perDayLimit === DAILY_MESSAGE_LIMIT_DEFUALT) {
    return new RateLimiterRedis({
      storeClient: redisClient,
      points: perDayLimit,

      keyPrefix: `tmd:${todayDateUTC}`,
      duration: DURATION,
    });
  }
  return new RateLimiterRedis({
    storeClient: redisClient,
    points: perDayLimit,
    keyPrefix: `tuser:${todayDateUTC}:${userId}`,
    duration: DURATION,
  });
}

// Extend FastifyRequest to include the auth property
declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext;
  }
}

const authHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const requestId =
    normalizeHeaderValue(request.headers['x-request-id']) || request.id;
  request.id = requestId;

  const log = chatLogger.child({
    requestId: request.id,
  });

  if (!IS_PROD) {
    log.warn({}, 'Running in non-prod mode, skipping auth');
    const user = await contextUser({
      privyId: 'test-user',
      requestId,
    });
    // Skip auth in non-prod environments
    request.auth = {
      privyUserId: user.privyId,
      user,
      rateLimiter: createRateLimiter({
        userId: user.id,
        perDayLimit: user.meta.perDayLimit,
      }),
    };
    return;
  }

  const token = request.headers?.['x-jwt-payload'];

  // Make sure that the incoming request has our JWT payload
  if (!token || typeof token !== 'string') {
    log.error({}, 'missing JWT payload');
    return reply.status(401).send({
      status: false,
      message: 'Missing JWT token',
    });
  }

  // convert the base64 token to a string and parse with zod
  const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
  const parsedToken = jwtSchema.safeParse(JSON.parse(decodedToken));

  if (!parsedToken.success) {
    log.error({ error: parsedToken.error }, 'invalid JWT payload');
    return reply.status(401).send({
      message: 'invalid JWT token',
    });
  }

  // check for expiry
  if (parsedToken.data.exp < Date.now() / 1000) {
    log.error({}, 'JWT token expired');
    return reply.status(401).send({
      message: 'JWT token expired',
    });
  }

  // check for audience
  if (parsedToken.data.aud !== PRIVY_APP_ID) {
    log.error({}, 'invalid JWT audience');
    return reply.status(401).send({
      message: 'invalid JWT audience',
    });
  }

  log.info({ userId: parsedToken.data.sub }, 'valid JWT token');
  const privyId = parsedToken.data.sub;
  const user = await contextUser({
    privyId,
    requestId,
  });

  request.auth = {
    privyUserId: privyId,
    user,
    rateLimiter: createRateLimiter({
      userId: user.id,
      perDayLimit: user.meta.perDayLimit,
    }),
  };
};

fastify.register(fastifyTRPCPlugin, {
  prefix: '/api/trpc',
  preHandler: [authHandler],
  trpcOptions: {
    router: appRouter,
    createContext,
    onError({ path, error }) {
      chatLogger.error(
        {
          error,
        },
        `Error in tRPC handler on path '${path}'`,
      );
    },
  },
});

const UserChatStreamInput = Type.Object({
  id: Type.String(),
  message: Type.Any(),
  forkedMessages: Type.Optional(Type.Array(Type.Any())),
});
type UserChatStreamInput = Static<typeof UserChatStreamInput>;

fastify.route<{ Body: UserChatStreamInput }>({
  method: 'post',
  bodyLimit: 10485760, // 10MB
  preHandler: [authHandler],
  schema: {
    body: UserChatStreamInput,
  },
  handler: async (request, reply) => {
    const requestId = request.id;
    apiRequest.inc({
      method: request.method,
      path: '/api/chat',
    });
    userMessageUsage.inc({
      user: request.auth.user.id,
      per_day_limit: request.auth.user.meta.perDayLimit,
    });

    // Create an AbortController for the backend
    const abortController = new AbortController();

    let { message, id, forkedMessages } = request.body as {
      message: UIMessage;
      id: string;
      forkedMessages?: UIMessage[];
    };

    const log = chatLogger.child({
      function: 'api-userchat',
      requestId: request.id,
      userId: request.auth.user.id,
      chatId: id,
    });

    try {
      const limiterRes = await request.auth.rateLimiter.consume(
        request.auth.user.id,
        1,
      );
      setRateLimitHeaders({
        reply,
        limiterRes,
        userLimit: request.auth.user.meta.perDayLimit,
      });
    } catch (error) {
      log.error(
        {
          error,
        },
        'Rate limit exceeded',
      );
      userMessageRateLimitHits.inc({
        user: request.auth.user.id,
        per_day_limit: request.auth.user.meta.perDayLimit,
      });
      setRateLimitHeaders({
        reply,
        limiterRes: error as RateLimiterRes,
        userLimit: request.auth.user.meta.perDayLimit,
      });
      throw new ChatSDKError(
        'rate_limit:chat',
        'Rate limit exceeded',
        requestId,
      );
    }

    if (!message) {
      return new ChatSDKError(
        'bad_request:chat',
        'no message provided',
        requestId,
      ).toResponse();
    }

    const chatId = id;

    const chat = await getChatById({
      id: chatId,
    });

    if (!chat) {
      try {
        const title = await generateTitleFromUserMessage({ message });
        await saveChat({
          id: chatId,
          title,
          userId: request.auth.user.id,
          visibility: 'private',
        });
      } catch (error) {
        return new ChatSDKError(
          'bad_request:chat',
          'unable to save chat',
          requestId,
        ).toResponse();
      }
    } else {
      if (chat.userId !== request.auth.user.id) {
        return new ChatSDKError(
          'forbidden:chat',
          undefined,
          requestId,
        ).toResponse();
      }
    }

    const userMessageText = message.content.toString();

    const previousMessages = await getMessagesByChatId({ id: chatId });

    if (forkedMessages && forkedMessages.length > 0) {
      log.info(
        { length: forkedMessages.length },
        'Forked messages detected, saving them',
      );

      try {
        await saveMessages({
          messages: forkedMessages.map(forkedMessage => ({
            chatId,
            id: crypto.randomUUID(),
            role: forkedMessage.role,
            parts: forkedMessage.parts,
          })),
        });
      } catch (error) {
        log.error({ error }, 'Error saving forked messages');
        return new ChatSDKError(
          'bad_request:chat',
          'unable to save forked messages',
          requestId,
        ).toResponse();
      }
    }

    let messages = appendClientMessage({
      // @ts-expect-error -  TODO: satisfy them some other day
      messages: [...(forkedMessages || []), ...(previousMessages || [])],
      message,
    });

    try {
      await saveMessages({
        messages: [
          {
            chatId,
            id: crypto.randomUUID(),
            role: 'user',
            parts: message.parts,
          },
        ],
      });
    } catch (error) {
      log.error({ error }, 'Error saving message');
      return new ChatSDKError(
        'bad_request:chat',
        'unable to save message',
        requestId,
      ).toResponse();
    }

    // Mark the response as a v1 data stream:
    setStreamHeaders(reply);

    let stream: StreamData | null = null;

    try {
      stream = new StreamData();

      // Listen for the client disconnecting (abort)
      request.raw.on('close', () => {
        if (request.raw.aborted) {
          log.info({}, 'Client disconnected, aborting stream');
          abortController.abort();
          // Clean up the stream on client disconnect
          if (stream) {
            stream.close().catch(closeError => {
              log.error(
                { closeError },
                'Error closing stream after client disconnect',
              );
            });
          }
        }
      });

      // Process any tweet URLs in the message
      const { messages: updatedMessages } = await extractAndProcessTweet(
        messages,
        userMessageText,
        stream,
        log,
      );

      // Update messages with the processed result
      messages = updatedMessages;

      const kb = await getKbContext(
        {
          // @ts-expect-error - TODO: fix these types
          messages: [...messages.filter(m => m.role !== 'system')],
          // latest message
          text: messages[messages.length - 1].content.toString(),
          manualEntries: 'chat',
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
          id: crypto.randomUUID(),
        });
      }

      const systemPrompt = messages.find(message => message.role === 'system');

      if (!systemPrompt) {
        const prompt = await PROMPTS.CHAT_INTERFACE_SYSTEM_PROMPT();
        messages.unshift({
          role: 'system',
          content: `${prompt}.\nCurrent date: ${new Date().toUTCString()}`,
          id: crypto.randomUUID(),
        });
      }

      const result = streamText({
        model: openai('gpt-4.1'),
        abortSignal: abortController.signal,
        messages,
        experimental_transform: smoothStream({}),
        temperature: TEMPERATURE,
        seed: SEED,
        tools: getChatTools(messages, log, stream),
        maxSteps: 5,
        experimental_generateMessageId: crypto.randomUUID,
        experimental_telemetry: { isEnabled: true, functionId: 'stream-text' },
        onError(error) {
          log.error(
            {
              error,
              aborted: abortController.signal.aborted,
            },
            'Error in chat stream',
          );

          // Close the stream on error to prevent further issues
          if (stream) {
            stream.close().catch(closeError => {
              log.error(
                { closeError },
                'Error closing stream after stream error',
              );
            });
          }
        },
        async onFinish(event) {
          if (event.response) {
            const lastMessage = event.response.messages.at(-1);

            if (!lastMessage) {
              log.error({}, 'unable to get message to save');
              await stream?.close();
              return;
            }

            const [, assistantMessage] = appendResponseMessages({
              messages: [message],
              responseMessages: event.response.messages,
            });

            await saveMessages({
              messages: [
                {
                  chatId,
                  parts: assistantMessage.parts,
                  role: 'assistant',
                  id: assistantMessage.id,
                },
              ],
            });
          }

          if (event.sources.length === 0) {
            await stream?.close();
            log.info({}, 'no sources found, stream closed');
            return;
          }
          const sources = event.sources;
          log.info({ sources }, 'sources');

          const urls = sources.map(source => source.url);

          if (urls) {
            stream?.append({ role: 'sources', content: urls });
          }
          log.info({}, 'appended sources to stream');
          await stream?.close();
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
      log.error(
        {
          error,
          aborted: abortController.signal.aborted,
        },
        'Error in chat stream',
      );

      // Ensure stream is closed on any error
      try {
        await stream?.close();
      } catch (closeError) {
        log.error(
          { closeError, chatId },
          'Error closing stream after main error',
        );
      }

      if (abortController.signal.aborted) {
        // Handle the abort gracefully
        reply.status(204).send(); // No Content
        return;
      }

      // Return a proper error response instead of throwing
      return new ChatSDKError(
        'bad_request:chat',
        'An error occurred while processing your message',
        requestId,
      ).toResponse();
    }
  },
  url: '/api/userchat',
});

const ChatDemoStreamInput = Type.Object({
  id: Type.String(),
  messages: Type.Array(Type.Any()),
  selectedChatModel: Type.String(),
  billSearch: Type.Boolean(),
  documentSearch: Type.Boolean(),
  manualKbSearch: Type.Boolean(),
  webSearch: Type.Boolean(),
  selectedKb: Type.String(),
});
type ChatDemoStreamInput = Static<typeof ChatDemoStreamInput>;

const demoAuthHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const requestId =
    normalizeHeaderValue(request.headers['x-request-id']) || request.id;
  request.id = requestId;

  const log = chatLogger.child({
    requestId: request.id,
  });

  const value = normalizeHeaderValue(request.headers['x-demo-api-secret']);

  if (DEMO_SECRET_API_KEY !== value) {
    log.error({}, 'Invalid Demo API key');
    return reply.status(401).send({
      status: false,
      message: 'Invalid Demo API key',
    });
  }

  log.info({}, 'Demo API key is valid');
};

fastify.route<{ Body: ChatDemoStreamInput }>({
  method: 'post',
  preHandler: [demoAuthHandler],
  schema: {
    body: ChatDemoStreamInput,
  },
  handler: async (request, reply) => {
    apiRequest.inc({
      method: request.method,
      path: '/api/chat-demo',
    });
    const log = chatLogger.child({
      function: 'api-chat-demo',
      requestId: request.id,
    });
    // Create an AbortController for the backend
    const abortController = new AbortController();
    let {
      billSearch,
      documentSearch,
      manualKbSearch,
      webSearch,
      messages,
      selectedKb,
      selectedChatModel,
    } = request.body as {
      documentSearch: boolean;
      manualKbSearch: boolean;
      webSearch: boolean;
      selectedKb: 'custom1' | 'custom2' | 'custom3' | 'chat' | 'agent';
      billSearch: boolean;
      messages: CoreMessage[];
      selectedChatModel: string;
      promptId?: string;
    };
    const userMessage = messages[messages.length - 1];

    if (!userMessage) {
      throw new Error('No user message');
    }

    const userMessageText = userMessage.content.toString();

    log.info({ text: userMessageText, selectedKb }, 'User message');

    // Listen for the client disconnecting (abort)
    request.raw.on('close', () => {
      if (request.raw.aborted) {
        abortController.abort();
      }
    });

    // Mark the response as a v1 data stream:
    setStreamHeaders(reply);

    try {
      const stream = new StreamData();

      // Process any tweet URLs in the message
      const { messages: updatedMessages } = await extractAndProcessTweet(
        // @ts-expect-error - TODO: fix typings
        messages,
        userMessageText,
        stream,
        log,
      );

      // Update messages with the processed result
      // @ts-expect-error - TODO: fix typings
      messages = updatedMessages;

      const latestMessage = messages[messages.length - 1];
      const convoHistory = messages.filter(
        message => message.role === 'user' || message.role === 'assistant',
      );

      const kb = await getKbContext(
        {
          messages: convoHistory,
          text: latestMessage.content.toString(),
          manualEntries: selectedKb,
          billEntries: false,
          documentEntries: false,
          openaiApiKey: OPENAI_API_KEY,
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
      }

      const systemPrompt = messages.find(message => message.role === 'system');

      if (!systemPrompt) {
        const prompt = await PROMPTS.DEMO_CHAT_CUSTOM_1();
        messages.unshift({
          role: 'system',
          content: `${prompt}.\nCurrent date: ${new Date().toUTCString()}`,
        });
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
        // @ts-expect-error - TODO: fix types
        tools: getChatTools(messages, log, stream),
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
  url: '/api/chat-demo',
});

// So in fly.io, health should do both the health check and the readiness check
fastify.route({
  method: 'GET',
  handler: async (_request, reply) => {
    return reply.send({ status: 'ready' }).code(200);
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

fastify.listen({ host: '::', port: 3001 }, async function (err, address) {
  // Initialize Redis client on server startup
  redisClient = new Redis(CHAT_REDIS_URL, {
    family: 6,
  });

  chatLogger.info({}, `Server listening on ${address}`);
  promClient.collectDefaultMetrics({
    labels: {
      app: 'chat',
    },
  });

  if (err) {
    await Promise.all([
      reportFailureToDiscord({ message: 'Chat server crashed: ' + err }),
      redisClient.shutdown(),
    ]);

    chatLogger.error(
      {
        error: err,
      },
      'Chat server crashed',
    );
    process.exit(1);
  }
});
