import {
  IS_PROD,
  OPEN_ROUTER_API_KEY,
  REJECTION_REASON,
  SEED,
  TEMPERATURE,
} from '../const';
import { inngest } from '../inngest';
import { NonRetriableError } from 'inngest';
import * as crypto from 'node:crypto';
import {
  getTimeInSecondsElapsedSinceTweetCreated,
  getTweet,
  getTweetContentAsText,
  longResponseFormatter,
  sanitizeLlmOutput,
  upsertChat,
  upsertUser,
} from './helpers.ts';
import {
  CoreMessage,
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { PROMPTS } from './prompts';
import {
  chat as chatDbSchema,
  db,
  eq,
  message as messageDbSchema,
} from 'database';
import {
  approvedTweetEngagement,
  rejectedTweet,
  reportFailureToDiscord,
  sendDevTweet,
} from '../discord/action.ts';
import { twitterClient } from './client.ts';
import { logger, WithLogger } from '../logger.ts';
import { getKbContext } from './knowledge-base.ts';
import {
  tweetProcessingTime,
  tweetPublishFailed,
  tweetsProcessingRejected,
  tweetsPublished,
} from '../prom.ts';
import { getSearchResult } from './web.ts';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: OPEN_ROUTER_API_KEY,
});

/**
 * Given summary of and text of tweet generate a long contextual response
 */
export async function getLongResponse(
  {
    summary,
    text,
    systemPrompt,
  }: {
    summary: string;
    text: string;
    systemPrompt?: string;
  },
  { method, log, action }: { log: WithLogger; method: string; action: string },
) {
  if (!systemPrompt) {
    systemPrompt = await PROMPTS.TWITTER_REPLY_TEMPLATE_KB();
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
    content: text,
  });

  const { text: _responseLong, reasoning } = await generateText({
    temperature: TEMPERATURE,
    seed: SEED,
    model: wrapLanguageModel({
      model: openrouter.chat('deepseek/deepseek-r1', {
        reasoning: {
          effort: 'high',
        },
      }),
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

/**
 * Using `getLongResponse` output generate a refined short response for more engaging output
 */
export async function getShortResponse({
  topic,
  refinePrompt,
}: {
  topic: string;
  refinePrompt?: string;
}) {
  if (!refinePrompt) {
    refinePrompt = await PROMPTS.REPLY_SHORTENER_PROMPT();
  }

  const { text: _finalAnswer } = await generateText({
    model: anthropic('claude-3-5-sonnet-latest'),
    temperature: TEMPERATURE,
    messages: [
      {
        role: 'system',
        content: refinePrompt,
      },
      {
        role: 'user',
        content: topic,
      },
    ],
  });

  const finalAnswer = sanitizeLlmOutput(_finalAnswer);

  return finalAnswer;
}

export const executeInteractionTweets = inngest.createFunction(
  {
    id: 'execute-interaction-tweets',
    onFailure: async ({ event, error }) => {
      const log = logger.child({
        module: 'execute-interaction-tweets',
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
        message: `[execute-interaction-tweets]:${id} ${errorMessage}`,
      });

      tweetPublishFailed.inc({
        method: 'execute-interaction-tweets',
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
  { event: 'tweet.execute.interaction' },
  async ({ event, step }) => {
    const log = logger.child({
      module: 'execute-interaction-tweets',
      tweetId: event.data.tweetId,
      eventId: event.id,
    });

    switch (event.data.action) {
      case 'reply-engage': {
        const dbChat = await step.run('check-db', async () => {
          // skip for local testing
          if (!IS_PROD) return null;

          return db.query.chat.findFirst({
            columns: {
              id: true,
              tweetId: true,
            },
            where: eq(chatDbSchema.tweetId, event.data.tweetId),
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

        const _text = await getTweetContentAsText(
          {
            id: event.data.tweetId,
          },
          log,
        ).catch(e => {
          log.error({ error: e }, 'Unable to get tweet as text');
          throw new NonRetriableError(e);
        });

        const REPLY_AS_DOGE_PREFIX = await PROMPTS.REPLY_AS_DOGE();
        const text = `${REPLY_AS_DOGE_PREFIX} "${_text}"`;

        const reply = await step.run('generate-reply', async () => {
          const kb = await getKbContext(
            {
              messages: [
                {
                  role: 'user',
                  content: _text,
                },
              ],
              text: _text,
              billEntries: true,
              documentEntries: true,
              manualEntries: 'agent',
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
                method: 'execute-interaction-tweets',
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

            // 90% of the time we return the long output, 10% of the time we return the short output
            const returnLong = Math.random() > 0.1;

            if (returnLong) {
              log.info({}, 'returning long');

              return {
                // Implicitly we are returning the long output so others can be ignored
                longOutput: '',
                refinedOutput: '',
                metadata,
                response: formatted,
              };
            }

            const finalAnswer = await getShortResponse({ topic: raw });
            log.info({ response: finalAnswer }, 'generated short');

            // some times claude safety kicks in and we get a NO
            if (finalAnswer.toLowerCase().startsWith('no')) {
              log.warn({}, 'claude safety kicked in. returning long');
              return {
                // Implicitly we are returning the long output so others can be ignored
                longOutput: '',
                refinedOutput: '',
                metadata,
                response: formatted,
              };
            }

            return {
              longOutput: formatted,
              refinedOutput: finalAnswer,
              metadata,
              response: finalAnswer,
            };
          } catch (e) {
            // @ts-expect-error for now
            throw new NonRetriableError(e?.message || e);
          }
        });

        const repliedTweet = await step.run('send-tweet', async () => {
          // Locally we don't want to send anything to Twitter
          if (!IS_PROD) {
            await sendDevTweet({
              tweetUrl: `https://x.com/i/status/${tweetToActionOn.id}`,
              question: text,
              response: reply.response,
              refinedOutput: reply.refinedOutput,
              longOutput: reply.longOutput,
            });
            return {
              id: 'local_id',
            };
          }

          try {
            const response = await twitterClient.v2.tweet(reply.response, {
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

          await approvedTweetEngagement({
            sentTweetUrl: `https://x.com/i/status/${repliedTweet.id}`,
            replyTweetUrl: tweetToActionOn.url,
            sent: reply.response,
            refinedOutput: reply.refinedOutput,
            longOutput: reply.longOutput,
          });
        });

        // embed and store reply
        await step.run('persist-chat', async () => {
          // No need to send to discord in local mode since we are already spamming dev test channel
          if (!IS_PROD) return;

          const user = await upsertUser({
            twitterId: tweetToActionOn.author.id,
          });

          const chat = await upsertChat({
            user: user.id,
            tweetId: tweetToActionOn.id,
          });

          const message = await db
            .insert(messageDbSchema)
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
              id: messageDbSchema.id,
              tweetId: messageDbSchema.tweetId,
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
