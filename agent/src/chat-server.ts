import cors from '@fastify/cors';
import { Static, Type } from '@sinclair/typebox';
import {
  appendClientMessage,
  appendResponseMessages,
  smoothStream,
  StreamData,
  streamText,
  UIMessage,
} from 'ai';
import { eq, InferSelectModel } from 'drizzle-orm';
import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import * as crypto from 'node:crypto';
import { z } from 'zod';
import { myProvider } from './api/chat';
import { ChatSDKError } from './chat-api/errors';
import {
  ChatDbInstance,
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from './chat-api/queries';
import { UserChatDb } from './chat-api/schema';
import { IS_PROD, PRIVY_APP_ID, SEED } from './const';
import { reportFailureToDiscord } from './discord/action';
import { chatLogger } from './logger';
import { apiRequest, promClient } from './prom';
import { getKbContext } from './twitter/knowledge-base';
import { PROMPTS } from './twitter/prompts';
import {
  extractAndProcessTweet,
  generateTitleFromUserMessage,
} from './utils/message-processing';
import { normalizeHeaderValue, setStreamHeaders } from './utils/stream';
import { getChatTools } from './utils/tools';

const fastify = Fastify();

fastify.register(cors, {
  allowedHeaders: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
  origin: [
    'http://localhost:4321',
    'http://localhost:4322',
    'https://manage.dogeai.info',
    'https://dogeai.chat',
    /^https:\/\/([a-zA-Z0-9-]+\.)*dogeai-chat\.pages\.dev$/, // Matches dogeai-chat.pages.dev and subdomains
  ],
});

const jwtSchema = z.object({
  sid: z.string(),
  iss: z.string(),
  iat: z.number(),
  aud: z.string(),
  sub: z.string(),
  exp: z.number(),
});

// Interface for the auth object
type AuthContext = {
  privyUserId: string;
  user: InferSelectModel<typeof UserChatDb>;
};

// Extend FastifyRequest to include the auth property
declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext;
  }
}

async function contextUser({
  privyId,
  requestId,
}: {
  privyId: string;
  requestId: string;
}) {
  // if user in DB return
  try {
    const user = await ChatDbInstance.query.UserChatDb.findFirst({
      where: eq(UserChatDb.privyId, privyId),
    });

    if (user) return user;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'unable to query user',
      requestId,
    );
  }

  // else create user in DB
  try {
    const [newUser] = await ChatDbInstance.insert(UserChatDb)
      .values({
        privyId,
      })
      .returning();
    return newUser;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'unable to create user',
      requestId,
    );
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
      privyUserId: 'test-user',
      user,
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
  };
};

const UserChatStreamInput = Type.Object({
  id: Type.String(),
  message: Type.Any(),
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
    const log = chatLogger.child({
      function: 'api-userchat',
      requestId: request.id,
      userId: request.auth.user.id,
    });

    // Create an AbortController for the backend
    const abortController = new AbortController();

    let { message, id } = request.body as {
      message: UIMessage;
      id: string;
    };

    if (!message) {
      return new ChatSDKError(
        'bad_request:chat',
        'no message provided',
        requestId,
      ).toResponse();
    }

    const chat = await getChatById({
      id,
    });

    if (!chat) {
      try {
        const title = await generateTitleFromUserMessage({ message });
        await saveChat({
          id,
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

    const previousMessages = await getMessagesByChatId({ id });
    log.info({ previousMessages }, 'hhhh');
    let messages = appendClientMessage({
      // @ts-expect-error -  TODO: satisfy them some other day
      messages: previousMessages,
      message,
    });

    try {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
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
          messages,
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
          id: crypto.randomUUID(),
        });
      }

      const result = streamText({
        model: myProvider.languageModel('gpt-4.1'),
        abortSignal: abortController.signal,
        messages,
        experimental_transform: smoothStream({}),
        temperature: 0,
        seed: SEED,
        tools: getChatTools(messages, log, stream),
        maxSteps: 5,
        experimental_generateMessageId: crypto.randomUUID,
        experimental_telemetry: { isEnabled: true, functionId: 'stream-text' },
        onError(error) {
          log.error({ error }, 'Error in chat stream');
        },
        async onFinish(event) {
          if (event.response) {
            const lastMessage = event.response.messages.at(-1);

            if (!lastMessage) {
              log.error({}, 'unable to get message to save');
              await stream.close();
              return;
            }

            const [, assistantMessage] = appendResponseMessages({
              messages: [message],
              responseMessages: event.response.messages,
            });

            await saveMessages({
              messages: [
                {
                  chatId: id,
                  parts: assistantMessage.parts,
                  role: 'assistant',
                  id: assistantMessage.id,
                },
              ],
            });
          }

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
  chatLogger.info({}, `Server listening on ${address}`);
  promClient.collectDefaultMetrics({
    labels: {
      app: 'chat',
    },
  });

  if (err) {
    await reportFailureToDiscord({ message: 'Chat server crashed: ' + err });
    chatLogger.error(
      {
        error: err,
      },
      'Chat server crashed',
    );
    process.exit(1);
  }
});
