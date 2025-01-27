import { REJECTION_REASON } from '../const';
import { inngest } from '../inngest';
import { NonRetriableError } from 'inngest';
import { generateEmbedding, generateEmbeddings, getTweet } from './helpers.ts';
import { CoreMessage, generateObject, generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  EXTRACT_BILL_TITLE_PROMPT,
  QUESTION_EXTRACTOR_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
  TWITTER_REPLY_TEMPLATE,
} from './prompts';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import {
  and,
  bill,
  billVector,
  chat as chatDbSchema,
  db,
  eq,
  inArray,
  like,
  message as messageDbSchema,
  messageVector,
  sql,
  user as userDbSchema,
  bill as billDbSchema,
} from 'database';

import { TWITTER_USERNAME } from '../const.ts';

import {
  approvedTweet,
  rejectedTweet,
  reportFailureToDiscord,
} from '../discord/action.ts';
import { twitterClient } from './client.ts';
import { z } from 'zod';

const textSplitter = new RecursiveCharacterTextSplitter({
  // Recommendations from ChatGPT
  chunkSize: 512,
  chunkOverlap: 100,
});

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
 * given a tweet id, we try to follow the thread get more context about the tweet
 */
export async function getTweetContext({ id }: { id: string }) {
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

    // Limit max tweets
    if (tweets.length > LIMIT) {
      searchId = null;
    }
  } while (searchId);

  return tweets
    .reverse()
    .map(tweet => tweet.text)
    .join('\n---\n');
}

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
    role:
      tweet.author.userName === TWITTER_USERNAME && tweet.author.isAutomated
        ? 'assistant'
        : 'user',
    content: tweet.text,
  }));
}

/**
 * Given some text try to narrow down the bill to focus on.
 *
 * If you get a bill title.
 * then we can filter the embeddings to that title
 * and then try to search for user question for embeddings
 *
 * If you do not get a bill title
 * we are out of luck and we just use the user question to search all the embeddings
 */
export async function getBillContext({
  text,
  question,
}: {
  text: string;
  question: string;
}) {
  const LIMIT = 10;
  const billTitleResult = await generateText({
    model: openai('gpt-4o'),
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: EXTRACT_BILL_TITLE_PROMPT,
      },

      {
        role: 'user',
        content: text,
      },
    ],
  });

  const questionEmbedding = await generateEmbedding(question);
  const embeddingArrayString = JSON.stringify(questionEmbedding);

  const billTitle = billTitleResult.text;

  if (billTitle.startsWith('NO_TITLE_FOUND')) {
    const vectorSearch = await db
      .select({
        text: billVector.text,
        bill: billVector.bill,
        distance: sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString}))`,
      })
      .from(billVector)
      .where(
        sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString})) < 0.4`,
      )
      .orderBy(
        // ascending order
        sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString})) ASC`,
      )
      .limit(LIMIT);

    return vectorSearch.map(row => row.text).join('\n---\n');
  }

  const billSearch = await db
    .select({ id: bill.id })
    .from(bill)
    .where(like(bill.title, billTitle))
    .limit(LIMIT);

  const vectorSearch = await db
    .select({
      text: billVector.text,
      bill: billVector.bill,
      distance: sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString}))`,
    })
    .from(billVector)
    .where(
      inArray(
        billVector.bill,
        billSearch.map(row => row.id),
      ),
    )
    .orderBy(
      // ascending order
      sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString})) ASC`,
    )
    .limit(10);

  return vectorSearch.map(row => row.text).join('\n---\n');
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
  const LIMIT = 10;

  const billTitleResult = await generateObject({
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
    billTitleResult.object.names.length === 0 &&
    billTitleResult.object.keywords.length === 0
  ) {
    throw new Error('No bills matched');
  }

  const questionEmbedding = await generateEmbedding(
    billTitleResult.object.names.join('\n---\n') +
      billTitleResult.object.keywords.join('\n---\n'),
  );
  const embeddingArrayString = JSON.stringify(questionEmbedding);

  const vectorSearch = await db
    .select({
      text: billVector.text,
      bill: billVector.bill,
      distance: sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString}))`,
    })
    .from(billVector)
    .orderBy(
      // ascending order
      sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString})) ASC`,
    )
    .limit(LIMIT);

  const baseText = vectorSearch.map(row => row.text).join('\n---\n');

  // 1) Ask LLM to extract the Bill Title from the text.
  const finalBill = await generateObject({
    model: openai('gpt-4o', {
      structuredOutputs: true,
    }),
    temperature: 0,
    tools: {
      searchBill: tool({
        description: `Given a bill title, find the corresponding bill ID in the database. If no bill is found, return 'NO_TITLE_FOUND'.`,
        parameters: z.object({
          title: z.string(),
        }),
        execute: async ({ title }) => {
          const bill = await db
            .select()
            .from(billDbSchema)
            .where(eq(billDbSchema.title, title))
            .limit(1);
          if (bill.length === 1) {
            return bill[0].originChamber + bill[0].number;
          } else {
            return 'NO_TITLE_FOUND';
          }
        },
      }),
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
              bill: billVector.bill,
              distance: sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString}))`,
            })
            .from(billVector)
            .orderBy(
              sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString})) ASC`,
            )
            .limit(5);

          return vectorSearch.map(row => ({
            id: row.bill,
            text: row.text,
            distance: row.distance,
          }));
        },
      }),
    },
    messages: [
      {
        role: 'system',
        content:
          "Analyze the text and identify the exact bill mentioned. Return ONLY the single corresponding bill ID from the database. If uncertain or no exact match is found, respond with 'NO_EXACT_MATCH'. Do not provide any additional commentary.",
      },
      {
        role: 'user',
        content: `startingPoint: ${baseText}\n\nText: ${billTitleResult.object.names.join('\n')} ${billTitleResult.object.keywords.join('\n')}`,
      },
    ],
    schemaName: 'billId',
    schemaDescription: 'The ID of the identified bill',
    schema: z.object({
      billId: z.string(),
    }),
    maxSteps: 5,
  });

  console.log(finalBill);

  const billId = finalBill.object.billId;
  if (billId === 'NO_TITLE_FOUND') {
    throw new Error('No bills matched');
  }

  if (typeof billId === 'string') {
    console.log('billId', billId);
    const type = billId.split('.')[0];
    const number = billId.split('.')[1];

    const bill = await db
      .select()
      .from(billDbSchema)
      .where(
        and(
          eq(billDbSchema.type, type),
          eq(billDbSchema.number, Number(number)),
        ),
      );
    if (bill.length === 0) {
      throw new Error('No bills matched');
    }
    console.log('real number: ', bill[0].htmlVersionUrl);
    return bill[0];
  }

  // everything else failed :(
  throw new Error('No bills matched');
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

        const reply = await step.run('generate-reply', async () => {
          const threadContext = tweetToActionOn.inReplyToId
            ? await getTweetContext({
                id: tweetToActionOn.inReplyToId,
              }).catch(e => {
                throw new NonRetriableError(e);
              })
            : tweetToActionOn.text;

          const relevantContext = await getBillContext({
            text: threadContext,
            question,
          });

          const response = await generateText({
            model: openai('gpt-4o'),
            temperature: 0,
            messages: [
              {
                role: 'system',
                content: SYSTEM_PROMPT,
              },
              {
                role: 'user',
                content: `Context from X: ${threadContext}`,
              },
              {
                role: 'user',
                content: `Context from database: ${relevantContext}`,
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
