import { createClient } from '@libsql/client';
import { actionDb as actionDbSchema, eq } from 'database';
import { drizzle } from 'drizzle-orm/libsql';
import { NonRetriableError } from 'inngest';
import * as crypto from 'node:crypto';
import { TwitterApi } from 'twitter-api-v2';
import {
  CDNYC_TURSO_AUTH_TOKEN,
  CDNYC_TURSO_DATABASE_URL,
  CDNYC_X_ACCESS_SECRET,
  CDNYC_X_ACCESS_TOKEN,
  DISCORD_CDNYC_APPROVED_CHANNEL_ID,
  DISCORD_CDNYC_REJECTED_CHANNEL_ID,
  IS_PROD,
  OPENAI_API_KEY,
  REJECTION_REASON,
  X_CONSUMER_SECRET,
  X_CONSUMER_TOKEN,
} from '../const';
import {
  approvedTweetEngagement,
  rejectedTweet,
  reportFailureToDiscord,
  sendDevTweet,
} from '../discord/action.ts';
import { inngest } from '../inngest';
import { logger } from '../logger.ts';
import {
  tweetProcessingTime,
  tweetPublishFailed,
  tweetsProcessingRejected,
  tweetsPublished,
} from '../prom.ts';
import { getLongResponse } from './execute-interaction.ts';
import {
  getTimeInSecondsElapsedSinceTweetCreated,
  getTweet,
  getTweetContentAsText,
} from './helpers.ts';
import { getKbContext } from './knowledge-base.ts';
import { getPromptContent } from '../controlplane-api/prompt-registry.ts';

const dbClient = createClient({
  url: CDNYC_TURSO_DATABASE_URL,
  authToken: CDNYC_TURSO_AUTH_TOKEN,
});

const twitterClient = new TwitterApi({
  appKey: X_CONSUMER_TOKEN,
  appSecret: X_CONSUMER_SECRET,
  accessToken: CDNYC_X_ACCESS_TOKEN,
  accessSecret: CDNYC_X_ACCESS_SECRET,
});

const DbInstance = drizzle({ client: dbClient, schema: actionDbSchema });

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

      const nonFatalError = [
        REJECTION_REASON.CONTAINS_REASONING,
        REJECTION_REASON.INPUT_TOO_LARGE_FOR_MODEL,
        REJECTION_REASON.NO_QUESTION_DETECTED,
      ].some(reason =>
        errorMessage.toLowerCase().startsWith(reason.toLowerCase()),
      );

      if (nonFatalError) {
        tweetsProcessingRejected.inc({
          method: ID,
          reason: errorMessage,
        });

        await rejectedTweet({
          tweetId: id,
          tweetUrl: url,
          reason: errorMessage,
          channelId: DISCORD_CDNYC_REJECTED_CHANNEL_ID,
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
              manualEntries: {
                orgId: '94e4cbb7-0265-4f84-8c55-251ba424c09f',
              },
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
            const [system, prefix] = await Promise.all([
              getPromptContent({
                key: 'TWITTER_REPLY_USING_KB',
                orgId: '94e4cbb7-0265-4f84-8c55-251ba424c09f',
              }),
              getPromptContent({
                key: 'REPLY_AS',
                orgId: '94e4cbb7-0265-4f84-8c55-251ba424c09f',
              }),
            ]);
            const { raw, metadata, formatted } = await getLongResponse(
              {
                summary,
                text,
                systemPrompt: system,
                prefixPrompt: prefix,
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
            tweetProcessingTime.observe({ method: ID }, timeElapsed);
            tweetsPublished.inc({
              action: event.data.action,
              method: ID,
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
            channelId: DISCORD_CDNYC_APPROVED_CHANNEL_ID,
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
