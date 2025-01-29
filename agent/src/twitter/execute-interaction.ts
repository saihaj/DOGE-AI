import { IS_PROD, REJECTION_REASON } from '../const';
import { inngest } from '../inngest';
import { NonRetriableError } from 'inngest';
import {
  generateEmbedding,
  generateEmbeddings,
  getTweet,
  textSplitter,
  upsertChat,
  upsertUser,
} from './helpers.ts';
import { CoreMessage, generateObject, generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PROMPTS } from './prompts';
import {
  billVector,
  chat as chatDbSchema,
  db,
  eq,
  inArray,
  message as messageDbSchema,
  messageVector,
  sql,
  bill as billDbSchema,
} from 'database';
import { TWITTER_USERNAME } from '../const.ts';
import {
  approvedTweet,
  rejectedTweet,
  reportFailureToDiscord,
  sendDevTweet,
} from '../discord/action.ts';
import { twitterClient } from './client.ts';
import { z } from 'zod';

/**
 * Given a tweet id, we return a list of messages.
 */
export async function getTweetMessages({
  id,
}: {
  id: string;
}): Promise<CoreMessage[]> {
  const LIMIT = 50;
  let tweets: Awaited<ReturnType<typeof getTweet>>[] = [];

  let searchId: null | string = id;
  do {
    const tweet = await getTweet({ id: searchId });
    tweets.push(tweet);
    if (tweet.inReplyToId) {
      searchId = tweet.inReplyToId;
    }

    if (tweet.inReplyToId === null) {
      searchId = null;
    }

    if (tweets.length > LIMIT) {
      searchId = null;
    }
  } while (searchId);

  return tweets.map(tweet => ({
    role: tweet.author.userName === TWITTER_USERNAME ? 'assistant' : 'user',
    content: `@${tweet.author.userName}: ${tweet.text}`,
  }));
}

/**
 * Given some text try to find the specific bill.
 *
 * If you do not get a bill title
 * we are out of luck and safely error
 */
export async function getReasonBillContext({
  messages,
}: {
  messages: CoreMessage[];
}) {
  const LIMIT = 5;
  const THRESHOLD = 0.6;

  const { object: billTitleResult } = await generateObject({
    model: openai('gpt-4o', {
      structuredOutputs: true,
    }),
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          'As a AI specialized in retrieving bill names and relevant keywords, you will be given a list of tweets and asked to extract the bill name and relevant keywords.',
      },
      ...messages,
      {
        role: 'user',
        content:
          'Based on the above tweets, extract the bill names and relevant bill keywords. If multiple bills are referenced, list all their titles.',
      },
    ],
    schemaName: 'bill',
    schemaDescription: 'A bill name and relevant keywords.',
    schema: z.object({
      names: z.array(z.string()),
      keywords: z.array(z.string()),
    }),
  });

  console.log(billTitleResult);

  if (
    billTitleResult.names.length === 0 &&
    billTitleResult.keywords.length === 0
  ) {
    throw new Error(REJECTION_REASON.NO_EXACT_MATCH);
  }

  const billIds = await (async () => {
    if (billTitleResult.names.length > 0) {
      const loweredTitles = billTitleResult.names.map(title =>
        title.toLowerCase(),
      );
      console.log(loweredTitles);
      const billSearch = await db
        .select({ id: billDbSchema.id })
        .from(billDbSchema)
        .where(inArray(sql`LOWER(${billDbSchema.title})`, loweredTitles))
        .limit(LIMIT);

      return billSearch.map(row => row.id);
    }
    return [];
  })();
  console.log(`Found ${billIds.length} bill IDs.`);

  // we got bills from the title, we can just return the first one
  if (billIds.length > 0) {
    const bill = await db
      .select()
      .from(billDbSchema)
      .where(inArray(billDbSchema.id, billIds))
      .limit(1);

    return bill[0];
  }

  const embeddingsForKeywords = await Promise.all(
    billTitleResult.keywords.map(async term => {
      const termEmbedding = await generateEmbedding(term);
      return JSON.stringify(termEmbedding);
    }),
  );
  console.log(`Found ${embeddingsForKeywords.length} embeddings.`);

  const searchPromises = embeddingsForKeywords.map(
    async termEmbeddingString => {
      const embeddingsQuery = db
        .select({
          text: billVector.text,
          billId: billVector.bill,
          distance: sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString}))`,
          title: billDbSchema.title,
        })
        .from(billVector)
        .where(
          sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString})) < ${THRESHOLD}`,
        )
        .orderBy(
          sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString})) ASC`,
        )
        .leftJoin(billDbSchema, eq(billDbSchema.id, billVector.bill))
        .limit(LIMIT);

      return embeddingsQuery;
    },
  );

  const searchResults = (await Promise.all(searchPromises)).flat();
  console.log(`Found ${searchResults.length} vector search results.`);

  const baseText = searchResults
    .map(({ title, text }) => {
      return `Bill: ${title}\nText:\n\n${text}`;
    })
    .join('\n\n');

  // 1) Ask LLM to extract the Bill Title from the text.
  const finalBill = await generateText({
    model: openai('gpt-4o'),
    temperature: 0,
    tools: {
      searchEmbeddings: tool({
        description:
          'Find similar bills based on the text. Return up to 5 bills.',
        parameters: z.object({
          text: z.string(),
        }),
        execute: async ({ text }) => {
          const embedding = await generateEmbedding(text);
          const embeddingArrayString = JSON.stringify(embedding);

          const vectorSearch = await db
            .select({
              text: billVector.text,
              billId: billVector.bill,
              distance: sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString}))`,
              title: billDbSchema.title,
            })
            .from(billVector)
            .where(
              sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString})) < ${THRESHOLD}`,
            )
            .orderBy(
              sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString})) ASC`,
            )
            .leftJoin(billDbSchema, eq(billDbSchema.id, billVector.bill))
            .limit(LIMIT);

          const results = vectorSearch.map(row => {
            return {
              title: row.title,
              text: row.text,
            };
          });

          return results;
        },
      }),
    },
    messages: [
      {
        role: 'system',
        content:
          "Analyze the text and identify the exact bill mentioned. Return ONLY the single corresponding bill title from the database. If uncertain or no exact match is found, respond with 'NO_EXACT_MATCH'. Do not provide any additional commentary.",
      },
      {
        role: 'user',
        content: `startingPoint: ${baseText}\n\nText: ${billTitleResult.names.join('\n')} ${billTitleResult.keywords.join('\n')}`,
      },
    ],
    maxSteps: 10,
  });

  console.log(finalBill.text);

  const billTitle = finalBill.text;
  if (
    billTitle.startsWith('NO_TITLE_FOUND') ||
    billTitle.startsWith('NO_EXACT_MATCH')
  ) {
    throw new Error(REJECTION_REASON.NO_EXACT_MATCH);
  }

  const bill = await db.query.bill.findFirst({
    where: eq(sql`lower(${billDbSchema.title})`, billTitle.toLowerCase()),
  });

  if (!bill) {
    throw new Error(REJECTION_REASON.NO_EXACT_MATCH);
  }

  return bill;
}

export const executeInteractionTweets = inngest.createFunction(
  {
    id: 'execute-interaction-tweets',
    onFailure: async ({ event, error }) => {
      const id = event?.data?.event?.data?.tweetId;
      const url = event?.data?.event?.data?.tweetUrl;

      if (!id || !url) {
        console.error('Failed to extract tweet ID or URL from event data');
        await reportFailureToDiscord({
          message: `[execute-interaction-tweets]: unable to extract tweet ID or URL from event data. Run id: ${event.data.run_id}`,
        });
        return;
      }

      await rejectedTweet({
        tweetId: id,
        tweetUrl: url,
        reason: error.message,
      });
    },
    throttle: {
      limit: 1,
      period: '10m',
    },
    concurrency: 4,
  },
  { event: 'tweet.execute.interaction' },
  async ({ event, step }) => {
    switch (event.data.action) {
      case 'reply': {
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
        const text = `@${tweetToActionOn.author.userName}: ${tweetToActionOn.text}`;

        const reply = await step.run('generate-reply', async () => {
          const bill = await getReasonBillContext({
            messages: [
              {
                role: 'user',
                content: text,
              },
            ],
          }).catch(_ => {
            return null;
          });

          const summary = bill ? `${bill.title}: \n\n${bill.content}` : '';

          const systemPrompt = await PROMPTS.SYSTEM_PROMPT();
          const response = await generateText({
            // o1-mini does not support temperature
            // @ts-ignore
            temperature: 0,
            model: openai('gpt-4o'),
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

          return response.text;
        });

        const repliedTweet = await step.run('send-tweet', async () => {
          // Locally we don't want to send anything to Twitter
          if (!IS_PROD) {
            await sendDevTweet({
              tweetUrl: `https://x.com/i/web/status/${tweetToActionOn.id}`,
              question: text,
              response: reply,
            });
            return {
              id: 'local_id',
            };
          }

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
          // No need to send to discord in local mode since we are already spamming dev test channel
          if (!IS_PROD) return;

          await approvedTweet({
            tweetUrl: `https://x.com/i/web/status/${repliedTweet.id}`,
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

          const [chunkActionTweet, chunkReply] = await Promise.all([
            textSplitter.splitText(tweetToActionOn.text),
            textSplitter.splitText(reply),
          ]);

          const actionTweetEmbeddings =
            await generateEmbeddings(chunkActionTweet);

          await db.insert(messageVector).values(
            chunkActionTweet
              .map((value, index) => ({
                value,
                embedding: actionTweetEmbeddings[index],
              }))
              .map(({ value, embedding }) => ({
                message: message[0].id,
                text: value,
                vector: sql`vector32(${JSON.stringify(embedding)})`,
              })),
          );

          const replyEmbeddings = await generateEmbeddings(chunkReply);

          await db.insert(messageVector).values(
            chunkReply
              .map((value, index) => ({
                value,
                embedding: replyEmbeddings[index],
              }))
              .map(({ value, embedding }) => ({
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
