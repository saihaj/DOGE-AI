import { IS_PROD, REJECTION_REASON } from '../const';
import { inngest } from '../inngest';
import { NonRetriableError } from 'inngest';
import * as crypto from 'node:crypto';
import {
  generateEmbedding,
  generateEmbeddings,
  getTweet,
  getTweetContentAsText,
  textSplitter,
  upsertChat,
  upsertUser,
} from './helpers.ts';
import { CoreMessage, generateObject, generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { BILL_RELATED_TO_TWEET_PROMPT, PROMPTS } from './prompts';
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
  and,
  isNotNull,
} from 'database';
import {
  approvedTweetEngagement,
  reportFailureToDiscord,
  sendDevTweet,
} from '../discord/action.ts';
import { twitterClient } from './client.ts';
import { z } from 'zod';
import { perplexity } from '@ai-sdk/perplexity';

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
          and(
            sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString})) < ${THRESHOLD}`,
            isNotNull(billVector.bill),
          ),
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

  const { text } = await generateText({
    model: openai('gpt-4o'),
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: BILL_RELATED_TO_TWEET_PROMPT,
      },
      {
        role: 'user',
        content: `Tweet: ${messages.map(m => m.content).join('\n')}\n\nBill: ${baseText}`,
      },
    ],
  });

  console.log(`Is bill related to tweet?: ${text}`);

  if (text.toLowerCase().startsWith('no')) {
    console.log(messages);
    throw new Error(REJECTION_REASON.UNRELATED_BILL);
  }

  // 1) Ask LLM to extract the Bill Title from the text.
  const finalBill = await generateText({
    model: openai('o3-mini'),
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
              and(
                sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString})) < ${THRESHOLD}`,
                isNotNull(billVector.bill),
              ),
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
        content: `First Result: ${baseText}\n\nText: ${billTitleResult.names.join('\n')} ${billTitleResult.keywords.join('\n')}`,
      },
    ],
    maxSteps: 10,
  });

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

/**
 * Given summary of and text of tweet generate a long contextual response
 */
export async function getLongResponse({
  summary,
  text,
  systemPrompt,
}: {
  summary: string;
  text: string;
  systemPrompt?: string;
}) {
  if (!systemPrompt) {
    systemPrompt = await PROMPTS.INTERACTION_SYSTEM_PROMPT();
  }
  const { text: _responseLong, experimental_providerMetadata } =
    await generateText({
      temperature: 0,
      model: perplexity('sonar-reasoning'),
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

  const responseLong = _responseLong
    .trim()
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/\[\d+\]/g, '')
    .replace(/^(\n)+/, '')
    .replace(/[\[\]]/g, '')
    .replace(/\bDOGEai\b/gi, '');

  return {
    responseLong,
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
    refinePrompt = await PROMPTS.INTERACTION_REFINE_OUTPUT_PROMPT({
      topic,
    });
  }

  const { text: _finalAnswer } = await generateText({
    model: openai('gpt-4o'),
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: refinePrompt,
      },
    ],
  });

  const finalAnswer = _finalAnswer
    .trim()
    .replace(/<\/?response_format>|<\/?mimicked_text>/g, '')
    .replace(/\[\d+\]/g, '')
    .replace(/^(\n)+/, '')
    .replace(/[\[\]]/g, '')
    .replace(/\bDOGEai\b/gi, '');

  return finalAnswer;
}

export const executeInteractionTweets = inngest.createFunction(
  {
    id: 'execute-interaction-tweets',
    onFailure: async ({ event, error }) => {
      const id = event?.data?.event?.data?.tweetId;
      const errorMessage = error.message;

      await reportFailureToDiscord({
        message: `[execute-interaction-tweets]:${id} ${errorMessage}`,
      });
    },
    timeouts: {
      start: '30m',
    },
    throttle: {
      limit: 1,
      period: '1m',
    },
  },
  { event: 'tweet.execute.interaction' },
  async ({ event, step }) => {
    switch (event.data.action) {
      case 'reply': {
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
          throw new NonRetriableError(REJECTION_REASON.ALREADY_REPLIED);
        }

        const tweetToActionOn = await getTweet({
          id: event.data.tweetId,
        }).catch(e => {
          throw new NonRetriableError(e);
        });

        const text = await getTweetContentAsText({
          id: event.data.tweetId,
        }).catch(e => {
          throw new NonRetriableError(e);
        });

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

          const { responseLong, metadata } = await getLongResponse({
            summary,
            text,
          });

          const finalAnswer = await getShortResponse({ topic: responseLong });

          /**
           * 30% time we want to send the long output
           * 70% time we want to send the refined output
           */
          const response = (() => {
            // some times claude safety kicks in and we get a NO
            if (finalAnswer.toLowerCase().startsWith('no')) {
              return responseLong;
            }

            return Math.random() > 0.3 ? finalAnswer : responseLong;
          })();

          return {
            longOutput: responseLong,
            refinedOutput: finalAnswer,
            metadata,
            response,
          };
        });

        const repliedTweet = await step.run('send-tweet', async () => {
          // Locally we don't want to send anything to Twitter
          if (!IS_PROD) {
            await sendDevTweet({
              tweetUrl: `https://x.com/i/web/status/${tweetToActionOn.id}`,
              question: text,
              response: reply.response,
              refinedOutput: reply.refinedOutput,
              longOutput: reply.longOutput,
            });
            return {
              id: 'local_id',
            };
          }

          const resp = await twitterClient.v2.tweet(reply.response, {
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
