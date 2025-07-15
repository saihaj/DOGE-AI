import {
  CoreMessage,
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from 'ai';
import { eq, actionDb as actionDbSchema } from 'database';
import { NonRetriableError } from 'inngest';
import * as crypto from 'node:crypto';
import {
  OPENAI_API_KEY,
  DEEPINFRA_API_KEY,
  IS_PROD,
  REJECTION_REASON,
  SEED,
  TEMPERATURE,
  CDNYC_TURSO_DATABASE_URL,
  CDNYC_TURSO_AUTH_TOKEN,
} from '../const';
import {
  approvedTweetEngagement,
  rejectedTweet,
  reportFailureToDiscord,
  sendDevTweet,
} from '../discord/action.ts';
import { inngest } from '../inngest';
import { logger, WithLogger } from '../logger.ts';
import {
  tweetProcessingTime,
  tweetPublishFailed,
  tweetsProcessingRejected,
  tweetsPublished,
} from '../prom.ts';
import { twitterClient } from './client.ts';
import {
  getTimeInSecondsElapsedSinceTweetCreated,
  getTweet,
  getTweetContentAsText,
  longResponseFormatter,
  sanitizeLlmOutput,
} from './helpers.ts';
import { getKbContext } from './knowledge-base.ts';
import { PROMPTS } from './prompts';
import { getSearchResult } from './web.ts';
import { createDeepInfra } from '@ai-sdk/deepinfra';
import { createOpenAI } from '@ai-sdk/openai';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

const deepinfra = createDeepInfra({
  apiKey: DEEPINFRA_API_KEY,
});

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
  compatibility: 'strict',
});

const client = createClient({
  url: CDNYC_TURSO_DATABASE_URL,
  authToken: CDNYC_TURSO_AUTH_TOKEN,
});

const DbInstance = drizzle({ client, schema: actionDbSchema });

async function upsertUser({ twitterId }: { twitterId: string }) {
  const user = await DbInstance.query.ActionDbTweetUser.findFirst({
    where: eq(actionDbSchema.ActionDbTweetUser.twitterId, twitterId),
    columns: {
      id: true,
    },
  });

  if (user) {
    return user;
  }

  const created = await DbInstance.insert(actionDbSchema.ActionDbTweetUser)
    .values({
      id: crypto.randomUUID(),
      twitterId,
    })
    .returning({ id: actionDbSchema.ActionDbTweetUser.id });

  const [result] = created;
  return result;
}

async function upsertChat({
  user,
  tweetId,
}: {
  user: string;
  tweetId: string;
}) {
  const lookupChat = await DbInstance.query.ActionDbTweetConversation.findFirst(
    {
      where: eq(actionDbSchema.ActionDbTweetConversation.tweetId, tweetId),
      columns: {
        id: true,
      },
    },
  );

  if (lookupChat) {
    return lookupChat;
  }

  const chat = await DbInstance.insert(actionDbSchema.ActionDbTweetConversation)
    .values({
      id: crypto.randomUUID(),
      user,
      tweetId,
    })
    .returning({ id: actionDbSchema.ActionDbTweetConversation.id });

  return chat[0];
}

/**
 * Given summary of and text of tweet generate a long contextual response
 */
export async function getLongResponse(
  {
    summary,
    text,
    systemPrompt,
    prefixPrompt,
  }: {
    summary: string;
    text: string;
    systemPrompt?: string;
    prefixPrompt?: string;
  },
  { method, log, action }: { log: WithLogger; method: string; action: string },
) {
  if (!systemPrompt) {
    systemPrompt = await PROMPTS.CDNYC_TWITTER_REPLY_TEMPLATE_KB();
  }

  const webSearchResults = await getSearchResult(
    {
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
    },
    log,
  );

  const messages = [
    {
      role: 'system',
      content: systemPrompt,
    },
  ] as CoreMessage[];

  if (summary) {
    messages.push({ role: 'user', content: summary });
  }

  const webResult = webSearchResults
    ?.map(
      result =>
        `Title: ${result.title}\nURL: ${result.url}\n\n Published Date: ${result.publishedDate}\n\n Content: ${result.text}\n\n`,
    )
    .join('');

  const sources =
    webSearchResults?.map(result => ({
      url: result.url,
      title: result.title,
      publishedDate: result.publishedDate,
    })) || [];

  if (webResult) {
    messages.push({
      role: 'user',
      content: `Web search results:\n\n${webResult}`,
    });
  }

  messages.push({
    role: 'user',
    content: `"${text}"`,
  });

  const { text: _responseLong, reasoning } = await generateText({
    temperature: TEMPERATURE,
    seed: SEED,
    model: wrapLanguageModel({
      model: deepinfra('deepseek-ai/DeepSeek-R1'),
      middleware: [
        extractReasoningMiddleware({
          tagName: 'think',
        }),
      ],
    }),
    messages: messages,
    experimental_generateMessageId: crypto.randomUUID,
    maxRetries: 0,
  });

  const metadata = sources.length > 0 ? JSON.stringify(sources) : null;

  log.info({ reasoning }, 'reasoning');
  log.info({ response: _responseLong }, 'raw long response');

  const responseLong = sanitizeLlmOutput(_responseLong);
  const formatted = await longResponseFormatter(responseLong);
  log.info({ response: formatted }, 'formatted long response');
  return {
    raw: responseLong,
    formatted,
    metadata,
  };
}

const ID = 'execute-cdnyc-interaction-tweet';
const baseLogger = logger.child({ module: ID });

export const executeCdnycInteractionTweets = inngest.createFunction(
  {
    id: ID,
    onFailure: async ({ event, error }) => {
      const log = baseLogger.child({
        tweetId: event.data.event.data.tweetId,
        eventId: event.data.event.id,
      });
      const id = event?.data?.event?.data?.tweetId;
      const url = event.data.event.data.tweetUrl;
      const errorMessage = error.message;

      log.error(
        { error: errorMessage },
        'Failed to execute interaction tweets',
      );

      if (
        errorMessage
          .toLowerCase()
          .startsWith(REJECTION_REASON.NO_QUESTION_DETECTED.toLowerCase())
      ) {
        tweetsProcessingRejected.inc({
          method: 'execute-interaction-tweets',
          reason: REJECTION_REASON.NO_QUESTION_DETECTED,
        });
        await rejectedTweet({
          tweetId: id,
          tweetUrl: url,
          reason: errorMessage,
        });
        return;
      }

      await reportFailureToDiscord({
        message: `[${ID}]:${id} ${errorMessage}`,
      });

      tweetPublishFailed.inc({
        method: ID,
      });
    },
    timeouts: {
      start: '15m',
    },
    throttle: {
      limit: 1,
      period: '15s',
    },
  },
  { event: 'tweet.execute.cdnyc-interaction' },
  async ({ event, step }) => {
    const log = baseLogger.child({
      tweetId: event.data.tweetId,
      eventId: event.id,
    });

    switch (event.data.action) {
      case 'reply-engage': {
        const dbChat = await step.run('check-db', async () => {
          // skip for local testing
          if (!IS_PROD) return null;

          return DbInstance.query.ActionDbTweetConversation.findFirst({
            columns: {
              id: true,
              tweetId: true,
            },
            where: eq(
              actionDbSchema.ActionDbTweetConversation.tweetId,
              event.data.tweetId,
            ),
          });
        });

        if (dbChat?.id) {
          log.warn({}, 'already replied');
          throw new NonRetriableError(REJECTION_REASON.ALREADY_REPLIED);
        }

        const tweetToActionOn = await getTweet({
          id: event.data.tweetId,
        }).catch(e => {
          log.error({ error: e }, 'Unable to get tweet');
          throw new NonRetriableError(e);
        });

        const text = await getTweetContentAsText(
          {
            id: event.data.tweetId,
          },
          log,
        ).catch(e => {
          log.error({ error: e }, 'Unable to get tweet as text');
          throw new NonRetriableError(e);
        });

        const reply = await step.run('generate-reply', async () => {
          const kb = await getKbContext(
            {
              messages: [
                {
                  role: 'user',
                  content: text,
                },
              ],
              text,
              billEntries: true,
              documentEntries: true,
              manualEntries: 'custom2',
              openaiApiKey: OPENAI_API_KEY,
            },
            log,
          );

          const bill = kb?.bill
            ? `${kb.bill.title}: \n\n${kb.bill.content}`
            : '';

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

          try {
            const { raw, metadata, formatted } = await getLongResponse(
              {
                summary,
                text,
              },
              {
                log,
                method: ID,
                action: event.data.action,
              },
            );

            log.info(
              {
                response: formatted,
                metadata,
              },
              'generated response',
            );

            return {
              longOutput: '',
              refinedOutput: '',
              metadata,
              response: formatted,
              shareMessage: null,
            };
          } catch (e) {
            // @ts-expect-error for now
            throw new NonRetriableError(e?.message || e);
          }
        });

        const repliedTweet = await step.run('send-tweet', async () => {
          const content = reply.shareMessage
            ? `${reply.response}\n\n${reply.shareMessage}`
            : reply.response;

          // Locally we don't want to send anything to Twitter
          if (!IS_PROD) {
            await sendDevTweet({
              tweetUrl: `https://x.com/i/status/${tweetToActionOn.id}`,
              question: text,
              response: content,
              refinedOutput: reply.refinedOutput,
              longOutput: reply.longOutput,
            });
            return {
              id: 'local_id',
            };
          }

          try {
            const response = await twitterClient.v2.tweet(content, {
              reply: {
                in_reply_to_tweet_id: tweetToActionOn.id,
              },
            });
            const timeElapsed =
              getTimeInSecondsElapsedSinceTweetCreated(tweetToActionOn);
            log.info({ response, deltaSeconds: timeElapsed }, 'tweet sent');
            tweetProcessingTime.observe(
              { method: 'execute-interaction-tweets' },
              timeElapsed,
            );
            tweetsPublished.inc({
              action: event.data.action,
              method: 'execute-interaction-tweets',
            });

            return {
              id: response.data.data.id,
            };
          } catch (error) {
            log.error({ error }, 'Failed to send tweet');
            throw new NonRetriableError(error as any);
          }
        });

        await step.run('notify-discord', async () => {
          // No need to send to discord in local mode since we are already spamming dev test channel
          if (!IS_PROD) return;

          const content = reply.shareMessage
            ? `${reply.response}\n\n${reply.shareMessage}`
            : reply.response;

          await approvedTweetEngagement({
            sentTweetUrl: `https://x.com/i/status/${repliedTweet.id}`,
            replyTweetUrl: tweetToActionOn.url,
            sent: content,
            refinedOutput: reply.refinedOutput,
            longOutput: reply.longOutput,
          });
        });

        // embed and store reply
        await step.run('persist-chat', async () => {
          // No need to send to discord in local mode since we are already spamming dev test channel
          // if (!IS_PROD) return;

          const user = await upsertUser({
            twitterId: tweetToActionOn.author.id,
          });

          const chat = await upsertChat({
            user: user.id,
            tweetId: tweetToActionOn.id,
          });

          const message = await DbInstance.insert(
            actionDbSchema.ActionDbTweetMessage,
          )
            .values([
              {
                id: crypto.randomUUID(),
                text: tweetToActionOn.text,
                chat: chat.id,
                role: 'user',
                tweetId: tweetToActionOn.id,
                meta: Buffer.from(
                  JSON.stringify({ eventAction: event.data.action }),
                ),
              },
              {
                id: crypto.randomUUID(),
                text: reply.response,
                chat: chat.id,
                role: 'assistant',
                tweetId: repliedTweet.id,
                meta: reply.metadata ? Buffer.from(reply.metadata) : null,
              },
            ])
            .returning({
              id: actionDbSchema.ActionDbTweetMessage.id,
              tweetId: actionDbSchema.ActionDbTweetMessage.tweetId,
            })
            .get();

          return message;
        });

        break;
      }
      default: {
        throw new NonRetriableError(REJECTION_REASON.ACTION_NOT_SUPPORTED);
      }
    }
  },
);
