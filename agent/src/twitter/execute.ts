import { IS_PROD, REJECTION_REASON, TWITTER_USERNAME } from '../const';
import { inngest } from '../inngest';
import { NonRetriableError } from 'inngest';
import {
  generateEmbeddings,
  getTweet,
  getTweetContentAsText,
  textSplitter,
  upsertChat,
  upsertUser,
} from './helpers.ts';
import { CoreMessage, generateText } from 'ai';
import * as crypto from 'node:crypto';
import { openai } from '@ai-sdk/openai';
import { PROMPTS, QUESTION_EXTRACTOR_SYSTEM_PROMPT } from './prompts';
import {
  db,
  eq,
  message as messageDbSchema,
  chat as chatDbSchema,
  messageVector,
  sql,
} from 'database';
import {
  approvedTweetEngagement,
  reportFailureToDiscord,
  sendDevTweet,
} from '../discord/action.ts';
import { twitterClient } from './client.ts';
import {
  getReasonBillContext,
  getShortResponse,
} from './execute-interaction.ts';
import { logger } from '../logger.ts';

/**
 * given a tweet id, we try to follow the full thread up to a certain limit.
 */
export async function getTweetContext({
  id,
}: {
  id: string;
}): Promise<Array<CoreMessage>> {
  const LIMIT = 50;
  let tweets: Array<CoreMessage> = [];

  let searchId: null | string = id;
  do {
    const tweet = await getTweet({ id: searchId });

    if (tweet.inReplyToId) {
      searchId = tweet.inReplyToId;
    }

    if (tweet.inReplyToId === null) {
      searchId = null;
    }

    // Limit max tweets
    if (tweets.length > LIMIT) {
      searchId = null;
    }

    // extract tweet text
    const content = await getTweetContentAsText({ id: tweet.id });

    tweets.push({
      // Bot tweets are always assistant
      role: tweet.author.userName === TWITTER_USERNAME ? 'assistant' : 'user',
      content,
    });
  } while (searchId);

  return tweets.reverse();
}

/**
 * Fetches tweets from the Twitter API and queues them for processing.
 */
export const executeTweets = inngest.createFunction(
  {
    id: 'execute-tweets',
    onFailure: async ({ event, error }) => {
      const id = event?.data?.event?.data?.tweetId;
      const log = logger.child({
        module: 'execute-tweets',
        tweetId: id,
        eventId: event.data.event.id,
      });
      const errorMessage = error.message;

      log.error({ error: errorMessage }, 'Failed to execute tweets');
      await reportFailureToDiscord({
        message: `[execute-tweets]:${id} ${errorMessage}`,
      });
    },
    throttle: {
      limit: 1,
      period: '1m',
    },
  },
  { event: 'tweet.execute' },
  async ({ event, step }) => {
    const log = logger.child({
      module: 'execute-tweets',
      tweetId: event.data.tweetId,
      eventId: event.id,
    });

    switch (event.data.action) {
      case 'reply': {
        // TODO: make sure we are not replying to a tweet we already replied to

        const dbChat = await step.run('check-db', async () => {
          return db.query.chat.findFirst({
            columns: {
              id: true,
              tweetId: true,
            },
            where: eq(chatDbSchema.tweetId, event.data.tweetId),
          });
        });

        if (dbChat?.id) {
          throw new NonRetriableError(REJECTION_REASON.ALREADY_REPLIED);
        }

        // Yes you can get the full context here but
        // this is optimization to avoid fetching too much
        // in case we just reject it
        const tweetToActionOn = await getTweet({
          id: event.data.tweetId,
        }).catch(e => {
          throw new NonRetriableError(e);
        });

        const question = await step.run('extract-question', async () => {
          const tweetText = tweetToActionOn.text;

          const { text: extractedQuestion } = await generateText({
            model: openai('gpt-4o'),
            temperature: 0,
            messages: [
              {
                role: 'system',
                content: QUESTION_EXTRACTOR_SYSTEM_PROMPT,
              },
              {
                role: 'user',
                content: tweetText,
              },
            ],
          });

          if (
            extractedQuestion.startsWith(REJECTION_REASON.NO_QUESTION_DETECTED)
          ) {
            throw new Error(REJECTION_REASON.NO_QUESTION_DETECTED);
          }

          return extractedQuestion;
        });

        const reply = await step.run('generate-reply', async () => {
          const tweetThread = await getTweetContext({ id: tweetToActionOn.id });
          const tweetWeRespondingTo = tweetThread.pop();

          if (!tweetWeRespondingTo) {
            throw new NonRetriableError(
              REJECTION_REASON.NO_TWEET_FOUND_TO_REPLY_TO,
            );
          }

          const bill = await getReasonBillContext({
            messages: tweetThread,
          }).catch(_ => {
            return null;
          });

          const summary = bill ? `${bill.title}: \n\n${bill.content}` : '';
          if (summary) {
            log.info({ summary, bill }, 'Bill found');
          } else {
            log.info({}, 'No bill found');
          }

          const messages: Array<CoreMessage> = [...tweetThread];

          if (summary) {
            messages.push({
              role: 'user',
              content: `Context from database: ${summary}\n\n`,
            });
          }

          messages.push({
            role: 'user',
            content: PROMPTS.REPLY_TWEET_QUESTION_PROMPT({ question }),
          });

          const PROMPT = await PROMPTS.TWITTER_REPLY_TEMPLATE();
          const { text } = await generateText({
            temperature: 0,
            model: openai('gpt-4o'),
            messages: [
              {
                role: 'system',
                content: PROMPT,
              },
              ...messages,
            ],
          });

          const refinedOutput = await getShortResponse({ topic: text });

          const reply = Math.random() > 0.5 ? refinedOutput : text;

          log.info(
            { long: text, short: refinedOutput, response: text },
            'Reply generated',
          );

          return {
            long: text,
            short: refinedOutput,
            text: reply,
          };
        });

        const repliedTweet = await step.run('send-tweet', async () => {
          // Locally we don't want to send anything to Twitter
          if (!IS_PROD) {
            await sendDevTweet({
              tweetUrl: `https://x.com/i/web/status/${tweetToActionOn.id}`,
              question,
              response: reply.text,
              longOutput: reply.long,
              refinedOutput: reply.short,
            });
            return {
              id: 'local_id',
            };
          }

          const resp = await twitterClient.v2.tweet(reply.text, {
            reply: {
              in_reply_to_tweet_id: tweetToActionOn.id,
            },
          });

          return {
            id: resp.data.id,
          };
        });

        await step.run('notify-discord', async () => {
          // No need to send to discord in local mode since we are already spamming dev test channel
          if (!IS_PROD) return;

          await approvedTweetEngagement({
            sentTweetUrl: `https://x.com/i/web/status/${repliedTweet.id}`,
            replyTweetUrl: tweetToActionOn.url,
            longOutput: reply.long,
            sent: reply.text,
            refinedOutput: reply.short,
          });
        });

        // embed and store reply
        await step.run('persist-chat', async () => {
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
              },
              {
                id: crypto.randomUUID(),
                text: reply.text,
                chat: chat.id,
                role: 'assistant',
                tweetId: repliedTweet.id,
              },
            ])
            .returning({
              id: messageDbSchema.id,
              tweetId: messageDbSchema.tweetId,
            });

          const [chunkActionTweet, chunkReply] = await Promise.all([
            textSplitter.splitText(tweetToActionOn.text),
            textSplitter.splitText(reply.text),
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
