import { IS_PROD, REJECTION_REASON, TEMPERATURE } from '../const';
import { inngest } from '../inngest';
import { NonRetriableError } from 'inngest';
import * as crypto from 'node:crypto';
import {
  generateEmbeddings,
  getTweet,
  getTweetContentAsText,
  highPriorityUser,
  longResponseFormatter,
  sanitizeLlmOutput,
  textSplitter,
  upsertChat,
  upsertUser,
  wokeTweetsRewriter,
} from './helpers.ts';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { PROMPTS } from './prompts';
import {
  chat as chatDbSchema,
  db,
  eq,
  message as messageDbSchema,
  messageVector,
  sql,
} from 'database';
import {
  approvedTweetEngagement,
  rejectedTweet,
  reportFailureToDiscord,
  sendDevTweet,
} from '../discord/action.ts';
import { twitterClient } from './client.ts';
import { perplexity } from '@ai-sdk/perplexity';
import { logger } from '../logger.ts';
import { getKbContext } from './knowledge-base.ts';
import {
  tweetPublishFailed,
  tweetsProcessingRejected,
  tweetsPublished,
} from '../prom.ts';

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
    systemPrompt = await PROMPTS.TWITTER_REPLY_TEMPLATE();
  }
  const { text: _responseLong, experimental_providerMetadata } =
    await generateText({
      temperature: TEMPERATURE,
      model: perplexity('sonar-reasoning-pro'),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: summary
            ? `Context from database: ${summary}\n\n Question: ${text}`
            : `${text}`,
        },
      ],
    });

  const metadata = experimental_providerMetadata
    ? JSON.stringify(experimental_providerMetadata)
    : null;

  const responseLong = sanitizeLlmOutput(_responseLong);
  const rewriter = await wokeTweetsRewriter(responseLong, {
    log,
    method,
    action,
  });
  const formatted = await longResponseFormatter(rewriter);

  return {
    responseLong,
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
      limit: 65,
      period: '15m',
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
              manualEntries: false,
            },
            log,
          );

          const bill = kb?.bill
            ? `${kb.bill.title}: \n\n${kb.bill.content}`
            : '';

          const summary = kb?.documents
            ? `${kb.documents}\n\n${bill}`
            : bill || '';

          const {
            responseLong,
            metadata,
            formatted: responseLongFormatted,
          } = await getLongResponse(
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
              response: responseLongFormatted,
              metadata,
            },
            'generated long response',
          );

          // 80% of the time we return the long output, 20% of the time we return the short output
          const returnLong = Math.random() > 0.2;

          if (returnLong) {
            log.info({}, 'returning long');

            return {
              // Implicitly we are returning the long output so others can be ignored
              longOutput: '',
              refinedOutput: '',
              metadata,
              response: responseLongFormatted,
            };
          }

          const finalAnswer = await getShortResponse({ topic: responseLong });
          log.info({ response: finalAnswer }, 'generated short');

          // some times claude safety kicks in and we get a NO
          if (finalAnswer.toLowerCase().startsWith('no')) {
            log.warn({}, 'claude safety kicked in. returning long');
            return {
              // Implicitly we are returning the long output so others can be ignored
              longOutput: '',
              refinedOutput: '',
              metadata,
              response: responseLongFormatted,
            };
          }

          return {
            longOutput: responseLongFormatted,
            refinedOutput: finalAnswer,
            metadata,
            response: finalAnswer,
          };
        });

        const repliedTweet = await step.run('send-tweet', async () => {
          // Locally we don't want to send anything to Twitter
          if (!IS_PROD) {
            await sendDevTweet({
              tweetUrl: `https://x.com/i/status/${tweetToActionOn.id}`,
              question: text,
              response: reply.response,
              priority: highPriorityUser(tweetToActionOn.author.userName),
              refinedOutput: reply.refinedOutput,
              longOutput: reply.longOutput,
            });
            return {
              id: 'local_id',
            };
          }

          try {
            const resp = await twitterClient.v2.tweet(reply.response, {
              reply: {
                in_reply_to_tweet_id: tweetToActionOn.id,
              },
            });
            log.info(resp, 'tweet sent');
            tweetsPublished.inc({
              action: event.data.action,
              method: 'execute-interaction-tweets',
            });

            return {
              id: resp.data.data.id,
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
            priority: highPriorityUser(tweetToActionOn.author.userName),
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
            });

          const [chunkActionTweet, chunkReply] = await Promise.all([
            textSplitter.splitText(tweetToActionOn.text),
            textSplitter.splitText(reply.response),
          ]);

          const actionTweetEmbeddings =
            await generateEmbeddings(chunkActionTweet);

          await db.insert(messageVector).values(
            chunkActionTweet
              .map((value, index) => ({
                id: crypto.randomUUID(),
                value,
                embedding: actionTweetEmbeddings[index],
              }))
              .map(({ value, embedding }) => ({
                id: crypto.randomUUID(),
                message: message[0].id,
                text: value,
                vector: sql`vector32(${JSON.stringify(embedding)})`,
              })),
          );

          const replyEmbeddings = await generateEmbeddings(chunkReply);

          await db.insert(messageVector).values(
            chunkReply
              .map((value, index) => ({
                id: crypto.randomUUID(),
                value,
                embedding: replyEmbeddings[index],
              }))
              .map(({ value, embedding }) => ({
                id: crypto.randomUUID(),
                message: message[1].id,
                text: value,
                vector: sql`vector32(${JSON.stringify(embedding)})`,
              })),
          );
        });

        break;
      }
      default: {
        throw new NonRetriableError(REJECTION_REASON.ACTION_NOT_SUPPORTED);
      }
    }
  },
);
