import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { CoreMessage, smoothStream, StreamData, streamText } from 'ai';
import * as crypto from 'node:crypto';
import cors from '@fastify/cors';
import { IS_PROD, PRIVY_APP_ID, SEED, TEMPERATURE } from './const';
import { normalizeHeaderValue, setStreamHeaders } from './utils/stream';
import { getChatTools } from './utils/tools';
import { extractAndProcessTweet } from './utils/message-processing';
import { reportFailureToDiscord } from './discord/action';
import { myProvider } from './api/chat';
import { chatLogger, logger } from './logger';
import { getKbContext } from './twitter/knowledge-base';
import { apiRequest, promClient } from './prom';
import { UserChatStreamInput } from './api/user-chat';
import { PROMPTS } from './twitter/prompts';
import { z } from 'zod';

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
  userId: string;
};

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

  const log = logger.child({
    requestId: request.id,
  });
  if (!IS_PROD) {
    log.warn({}, 'Running in non-prod mode, skipping auth');
    // Skip auth in non-prod environments
    request.auth = {
      userId: 'test-user',
    };
    return;
  }

  const token = request.headers?.['x-jwt-payload'];

  // Make sure that the incoming request has our JWT payload
  if (!token || typeof token !== 'string') {
    log.error({}, 'missing JWT payload');
    return reply.status(403).send({
      status: false,
      message: 'Missing JWT token',
    });
  }

  // convert the base64 token to a string and parse with zod
  const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
  const parsedToken = jwtSchema.safeParse(JSON.parse(decodedToken));

  if (!parsedToken.success) {
    log.error({ error: parsedToken.error }, 'invalid JWT payload');
    return reply.status(403).send({
      message: 'invalid JWT token',
    });
  }

  // check for expiry
  if (parsedToken.data.exp < Date.now() / 1000) {
    log.error({}, 'JWT token expired');
    return reply.status(403).send({
      message: 'JWT token expired',
    });
  }

  // check for audience
  if (parsedToken.data.aud !== PRIVY_APP_ID) {
    log.error({}, 'invalid JWT audience');
    return reply.status(403).send({
      message: 'invalid JWT audience',
    });
  }

  log.info({ userId: parsedToken.data.sub }, 'valid JWT token');
  request.auth = {
    userId: parsedToken.data.sub,
  };
};

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
      path: '/api/chat',
    });
    const log = logger.child({
      function: 'api-userchat',
      requestId: request.id,
      userId: request.auth.userId,
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
        tools: getChatTools(messages, log, stream),
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
    logger.error(
      {
        error: err,
      },
      'Chat server crashed',
    );
    process.exit(1);
  }
});
