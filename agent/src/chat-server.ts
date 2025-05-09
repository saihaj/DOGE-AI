import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { CoreMessage, smoothStream, StreamData, streamText } from 'ai';
import * as crypto from 'node:crypto';
import cors from '@fastify/cors';
import {
  CF_TEAM_DOMAIN,
  IS_PROD,
  PRIVY_APP_ID,
  PRIVY_JWKS,
  SEED,
  TEMPERATURE,
} from './const';
import { setStreamHeaders } from './utils/stream';
import { getChatTools } from './utils/tools';
import { extractAndProcessTweet } from './utils/message-processing';
import { discordClient } from './discord/client';
import { reportFailureToDiscord } from './discord/action';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { myProvider } from './api/chat';
import { chatLogger, logger } from './logger';
import { getKbContext } from './twitter/knowledge-base';
import { apiRequest, promClient, readiness } from './prom';
import { UserChatStreamInput } from './api/user-chat';
import { PROMPTS } from './twitter/prompts';

const fastify = Fastify();

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

fastify.listen({ host: '0.0.0.0', port: 3001 }, async function (err, address) {
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
