import { REJECTION_REASON } from '../const';
import { inngest } from '../inngest';
import { NonRetriableError } from 'inngest';
import { getTweet } from './helpers.ts';
import { createXai } from '@ai-sdk/xai';
import { generateText, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  QUESTION_EXTRACTOR_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
  TWITTER_REPLY_TEMPLATE,
} from './prompts';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import {
  chat as chatDbSchema,
  db,
  eq,
  message as messageDbSchema,
  messageVector,
  sql,
  user as userDbSchema,
} from 'database';
import {
  approvedTweet,
  rejectedTweet,
  reportFailureToDiscord,
} from '../discord/action.ts';
import { twitterClient } from './client.ts';

const textSplitter = new RecursiveCharacterTextSplitter({
  // Recommendations from ChatGPT
  chunkSize: 512,
  chunkOverlap: 100,
});

const xAi = createXai({});
const embeddingModel = openai.textEmbeddingModel('text-embedding-3-small');

async function upsertUser({ twitterId }: { twitterId: string }) {
  const user = await db.query.user.findFirst({
    where: eq(userDbSchema.twitterId, twitterId),
    columns: {
      id: true,
    },
  });

  if (user) {
    return user;
  }

  const created = await db
    .insert(userDbSchema)
    .values({
      twitterId,
    })
    .returning({ id: userDbSchema.id });

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
  const lookupChat = await db.query.chat.findFirst({
    where: eq(chatDbSchema.tweetId, tweetId),
    columns: {
      id: true,
    },
  });

  if (lookupChat) {
    return lookupChat;
  }

  const chat = await db
    .insert(chatDbSchema)
    .values({
      user,
      tweetId,
    })
    .returning({ id: chatDbSchema.id });

  return chat[0];
}
/**
 * Fetches tweets from the Twitter API and queues them for processing.
 */
export const executeTweets = inngest.createFunction(
  {
    id: 'execute-tweets',
    onFailure: async ({ event, error }) => {
      const id = event?.data?.event?.data?.tweetId;
      const url = event?.data?.event?.data?.tweetUrl;

      if (!id || !url) {
        console.error('Failed to extract tweet ID or URL from event data');
        await reportFailureToDiscord({
          message: `[execute-tweets]: unable to extract tweet ID or URL from event data. Run id: ${event.data.run_id}`,
        });
        return;
      }

      await rejectedTweet({
        tweetId: id,
        tweetUrl: url,
        reason: error.message,
      });
    },
  },
  { event: 'tweet.execute' },
  async ({ event, step }) => {
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

        const tweetToActionOn = await getTweet({
          id: event.data.tweetId,
        }).catch(e => {
          throw new NonRetriableError(e);
        });

        const mainTweet = await getTweet({
          id: tweetToActionOn.inReplyToId!,
        }).catch(e => {
          throw new NonRetriableError(e);
        });

        const question = await step.run('extract-question', async () => {
          const text = tweetToActionOn.text;
          const result = await generateText({
            model: openai('gpt-4o'),
            temperature: 0,
            messages: [
              {
                role: 'system',
                content: QUESTION_EXTRACTOR_SYSTEM_PROMPT,
              },
              {
                role: 'user',
                content: text,
              },
            ],
          });

          if (result.text.startsWith('NO_QUESTION_DETECTED')) {
            throw new NonRetriableError(REJECTION_REASON.NO_QUESTION_DETECTED);
          }

          return result.text;
        });

        // TODO: improvement is connecting it with the KB store and provide more context

        const reply = await step.run('generate-reply', async () => {
          const response = await generateText({
            model: xAi('grok-2-1212'),
            temperature: 0,
            messages: [
              {
                role: 'system',
                content: SYSTEM_PROMPT,
              },
              {
                role: 'user',
                content: mainTweet.text,
              },
              {
                role: 'user',
                content: TWITTER_REPLY_TEMPLATE,
              },
              {
                role: 'user',
                content: question,
              },
            ],
          });

          return response.text;
        });

        // send reply
        const repliedTweet = await step.run('send-tweet', async () => {
          const resp = await twitterClient.v2.tweet(reply, {
            reply: {
              in_reply_to_tweet_id: tweetToActionOn.id,
            },
          });

          return {
            id: resp.data.id,
          };
        });

        await step.run('notify-discord', async () => {
          await approvedTweet({
            tweetUrl: `https://twitter.com/i/web/status/${repliedTweet.id}`,
          });
        });

        // embed and store reply
        await step.run('persist-chat', async () => {
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
                text: mainTweet.text,
                chat: chat.id,
                role: 'assistant',
                tweetId: mainTweet.id,
              },
              {
                text: tweetToActionOn.text,
                chat: chat.id,
                role: 'user',
                tweetId: tweetToActionOn.id,
              },
              {
                text: reply,
                chat: chat.id,
                role: 'assistant',
                tweetId: repliedTweet.id,
              },
            ])
            .returning({
              id: messageDbSchema.id,
              tweetId: messageDbSchema.tweetId,
            });

          const [chunkMain, chunkActionTweet, chunkReply] = await Promise.all([
            textSplitter.splitText(mainTweet.text),
            textSplitter.splitText(tweetToActionOn.text),
            textSplitter.splitText(reply),
          ]);

          const { embeddings: mainEmbeddings } = await embedMany({
            model: embeddingModel,
            values: chunkMain,
          });

          await db.insert(messageVector).values(
            chunkMain
              .map((value, index) => ({
                value,
                embedding: mainEmbeddings[index],
              }))
              .map(({ value, embedding }) => ({
                message: message[0].id,
                text: value,
                vector: sql`vector32(${JSON.stringify(embedding)})`,
              })),
          );

          const { embeddings: actionTweetEmbeddings } = await embedMany({
            model: embeddingModel,
            values: chunkActionTweet,
          });

          await db.insert(messageVector).values(
            chunkActionTweet
              .map((value, index) => ({
                value,
                embedding: actionTweetEmbeddings[index],
              }))
              .map(({ value, embedding }) => ({
                message: message[1].id,
                text: value,
                vector: sql`vector32(${JSON.stringify(embedding)})`,
              })),
          );

          const { embeddings: replyEmbeddings } = await embedMany({
            model: embeddingModel,
            values: chunkReply,
          });

          await db.insert(messageVector).values(
            chunkReply
              .map((value, index) => ({
                value,
                embedding: replyEmbeddings[index],
              }))
              .map(({ value, embedding }) => ({
                message: message[2].id,
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
