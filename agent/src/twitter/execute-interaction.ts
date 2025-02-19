import {
  ACTIVE_CONGRESS,
  IS_PROD,
  REJECTION_REASON,
  SEED,
  TEMPERATURE,
} from '../const';
import { inngest } from '../inngest';
import { NonRetriableError } from 'inngest';
import * as crypto from 'node:crypto';
import {
  generateEmbedding,
  generateEmbeddings,
  getTweet,
  getTweetContentAsText,
  longResponseFormatter,
  sanitizeLlmOutput,
  textSplitter,
  upsertChat,
  upsertUser,
} from './helpers.ts';
import { CoreMessage, generateObject, generateText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
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
  rejectedTweet,
  reportFailureToDiscord,
  sendDevTweet,
} from '../discord/action.ts';
import { twitterClient } from './client.ts';
import { z } from 'zod';
import { perplexity } from '@ai-sdk/perplexity';
import { logger, WithLogger } from '../logger.ts';

/**
 * Given some text try to find the specific bill.
 *
 * If you do not get a bill title
 * we are out of luck and safely error
 */
export async function getReasonBillContext(
  {
    messages,
  }: {
    messages: CoreMessage[];
  },
  logger: WithLogger,
) {
  const log = logger.child({
    method: 'getReasonBillContext',
  });
  const LIMIT = 5;
  const THRESHOLD = 0.6;

  const { object: billTitleResult } = await generateObject({
    model: openai('gpt-4o', {
      structuredOutputs: true,
    }),
    seed: SEED,
    temperature: TEMPERATURE,
    messages: [
      {
        role: 'system',
        content: `You are an AI specialized in extracting bill names, relevant keywords, and bill numbers from text. Given a list of tweets, your task is to return a structured output with the following fields:
- names: An array of bill names mentioned in the text.
- keywords: An array of relevant keywords related to the bill or topic discussed.
- billNumber (optional): If a bill is mentioned in any of the following formats, extract and return only the numeric part:
  - "H.R. 8127" → "8127"
  - "HR 8127" → "8127"
  - "H.R 8127" → "8127"
  - "S. 8127" → "8127"
  - "S 8127" → "8127"
  - "s 8127" → "8127"
  - "hr 8127" → "8127"
  - "h.r. 8127" → "8127"
  - "h.r 8127" → "8127"
 The bill number should always be extracted as a numeric string without prefixes or extra characters.

If no bill number is found, omit this field.
Ensure accuracy in extracting bill names and keywords while maintaining the expected structured output.`,
      },
      ...messages,
      {
        role: 'user',
        content:
          'Based on the above tweets, extract the bill names, relevant bill keywords and billNumber. If multiple bills are referenced, list all their titles.',
      },
    ],
    schemaName: 'bill',
    schemaDescription: 'A bill name, relevant keywords and bill number.',
    schema: z.object({
      names: z.array(z.string()),
      keywords: z.array(z.string()),
      billNumber: z.nullable(z.number()),
    }),
  });
  log.info(billTitleResult, 'extracted bill information');

  if (
    billTitleResult.names.length === 0 &&
    billTitleResult.keywords.length === 0 &&
    billTitleResult?.billNumber === null
  ) {
    throw new Error(REJECTION_REASON.NO_EXACT_MATCH);
  }

  // having a bill number makes searching easier
  if (billTitleResult.billNumber) {
    log.info({}, 'Searching for bill from number');
    const billFromNumbers = await db
      .select({
        text: billDbSchema.summary,
        billId: billDbSchema.id,
        title: billDbSchema.title,
        introducedDate: billDbSchema.introducedDate,
      })
      .from(billDbSchema)
      .where(eq(billDbSchema.number, billTitleResult.billNumber));
    log.info(
      { size: billFromNumbers.length },
      `Found ${billFromNumbers.length} bills from number`,
    );

    const billsText = billFromNumbers
      .map(
        ({ title, text, introducedDate, billId }) =>
          `"billId": ${billId} "title": ${title} "introducedDate": ${introducedDate} "summary": ${text}`,
      )
      .join('\n\n');

    // now we need to narrow down what bill person is asking about
    const { object: relevantBill } = await generateObject({
      model: openai('gpt-4o', {
        structuredOutputs: true,
      }),
      seed: SEED,
      temperature: TEMPERATURE,
      messages: [
        {
          role: 'system',
          content: `You are an AI that selects the most relevant bill from a given list based on conversation context.  
Input:
- A list of bills, each with a "billId", title, summary introduced date.  
- The extracted bill number.  
- Relevant keywords and conversation context.  

Task:  
- Analyze the provided bills and determine which "billId" best matches the **conversation context and user intent.  
- Prioritize relevance based on keywords, topic alignment, and recency.  
- If a clear contextual match exists, return the corresponding "billId".
- If no strong match is found, return the most recently introduced bill instead.

Expected Output:
{ "billId": "best_matching_bill_id" }
Always return a "billId", selecting the most recent bill if no contextual match is available.
`,
        },
        {
          role: 'user',
          content: `Conversation Context: ${messages.map(m => m.content).join('\n')}\n\n\nBills: ${billsText}`,
        },
      ],
      schemaName: 'relevantBill',
      schemaDescription: 'Relevant bill ID based on conversation context.',
      schema: z.object({
        billId: z.nullable(z.string()),
      }),
    });
    console.log(relevantBill);

    if (!relevantBill.billId) {
      log.warn({}, 'no relevant bill found');
      throw new Error(REJECTION_REASON.NO_BILL_ID_FOUND);
    }

    const bill = await db.query.bill.findFirst({
      columns: { id: true, title: true, content: true },
      where: eq(billDbSchema.id, relevantBill.billId),
    });

    if (!bill) {
      log.error({ billId: relevantBill.billId }, 'bill not found');
      throw new Error(REJECTION_REASON.NO_BILL_FOUND);
    }

    return bill;
  }

  const billIds = await (async () => {
    if (billTitleResult.names.length > 0) {
      const loweredTitles = billTitleResult.names.map(title =>
        title.toLowerCase(),
      );
      log.debug(loweredTitles);
      const billSearch = await db
        .select({ id: billDbSchema.id })
        .from(billDbSchema)
        .where(inArray(sql`LOWER(${billDbSchema.title})`, loweredTitles))
        .limit(LIMIT);

      return billSearch.map(row => row.id);
    }
    return [];
  })();

  log.info(
    {
      size: billIds.length,
    },
    `Found ${billIds.length} bill IDs.`,
  );

  // we got bills from the title, we can just return the first one
  if (billIds.length > 0) {
    const bill = await db
      .select({
        id: billDbSchema.id,
        title: billDbSchema.title,
        content: billDbSchema.content,
      })
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
  log.info({}, `Found ${embeddingsForKeywords.length} embeddings.`);

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
            eq(billDbSchema.congress, ACTIVE_CONGRESS),
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
  log.info(
    { size: searchResults.length },
    `Found ${searchResults.length} vector search results.`,
  );

  const baseText = searchResults
    .map(({ title, text, billId }) => {
      return `billId: "${billId}" Bill Title: "${title}"\nText:\n"${text}"`;
    })
    .join('\n\n');

  const { object: relatedBills } = await generateObject({
    model: openai('gpt-4o'),
    seed: SEED,
    temperature: TEMPERATURE,
    schemaName: 'billRelatedToTweet',
    schema: z.object({
      billIds: z.array(z.string()).nullish(),
    }),
    schemaDescription: 'List of billIds related to the tweet.',
    messages: [
      {
        role: 'system',
        content: BILL_RELATED_TO_TWEET_PROMPT,
      },
      {
        role: 'user',
        content: `Tweet: ${messages.map(m => m.content).join('\n')}\n\nBills: ${baseText}`,
      },
    ],
  });

  if (!relatedBills.billIds?.length) {
    log.warn(messages, 'No bill related to tweet.');
    throw new Error(REJECTION_REASON.UNRELATED_BILL);
  }

  log.info(
    { size: relatedBills.billIds.length },
    `related bills found: ${relatedBills.billIds.length}`,
  );

  // just got one bill return that
  if (relatedBills.billIds.length === 1) {
    const bill = await db.query.bill.findFirst({
      columns: { id: true, title: true, content: true },
      where: eq(billDbSchema.id, relatedBills.billIds[0]),
    });

    if (!bill) {
      log.error({}, 'bill not found');
      throw new Error(REJECTION_REASON.NO_EXACT_MATCH);
    }

    return bill;
  }

  const finalBill = await generateText({
    model: openai('gpt-4o'),
    seed: SEED,
    temperature: TEMPERATURE,
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
          const filters = [
            sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString})) < ${THRESHOLD}`,
            isNotNull(billVector.bill),
            eq(billDbSchema.congress, ACTIVE_CONGRESS),
          ];

          if (relatedBills?.billIds) {
            filters.push(inArray(billVector.bill, relatedBills.billIds));
          }

          const vectorSearch = await db
            .select({
              billId: billVector.bill,
              text: billVector.text,
            })
            .from(billVector)
            .where(and(...filters))
            .orderBy(
              sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString})) ASC`,
            )
            .limit(LIMIT);

          const results = vectorSearch.map(row => {
            return {
              billId: row.billId,
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
        content: `Analyze the text and identify the exact bill mentioned. Return ONLY the single corresponding "billId" from the database. If uncertain or no exact match is found, respond with 'NO_EXACT_MATCH'. Do not provide any additional commentary.`,
      },
      {
        role: 'user',
        content: `startingPoint: ${baseText}\n\nText: ${billTitleResult.names.join('\n')} ${billTitleResult.keywords.join('\n')}`,
      },
    ],
    maxSteps: 10,
  });

  const finalBillId = finalBill.text;
  if (
    finalBillId.startsWith('NO_TITLE_FOUND') ||
    finalBillId.startsWith('NO_EXACT_MATCH')
  ) {
    log.warn({}, 'no bill titled matched');
    throw new Error(REJECTION_REASON.NO_EXACT_MATCH);
  }

  const bill = await db.query.bill.findFirst({
    columns: { id: true, title: true, content: true },
    where: eq(billDbSchema.id, finalBillId),
  });

  if (!bill) {
    log.error({}, 'bill not found');
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
      temperature: TEMPERATURE,
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

  const responseLong = sanitizeLlmOutput(_responseLong);

  const formatted = await longResponseFormatter(responseLong);

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

  const finalAnswer = _finalAnswer
    .trim()
    .replace(/<\/?response_format>|<\/?mimicked_text>/g, '')
    .replace(/\[\d+\]/g, '')
    .replace(/^(\n)+/, '')
    .replace(/[\[\]]/g, '')
    .replace(/\bDOGEai\b(:)?/gi, '');

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
    },
    timeouts: {
      start: '30m',
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
          const bill = await getReasonBillContext(
            {
              messages: [
                {
                  role: 'user',
                  content: text,
                },
              ],
            },
            log,
          ).catch(_ => {
            return null;
          });

          const summary = bill ? `${bill.title}: \n\n${bill.content}` : '';

          if (bill) {
            log.info(
              {
                billId: bill.id,
                billTitle: bill.title,
              },
              'found bill',
            );
          }

          const {
            responseLong,
            metadata,
            formatted: responseLongFormatted,
          } = await getLongResponse({
            summary,
            text,
          });

          const finalAnswer = await getShortResponse({ topic: responseLong });

          /**
           * 80% time we want to send the long output
           * 20% time we want to send the refined output
           */
          const response = (() => {
            // some times claude safety kicks in and we get a NO
            if (finalAnswer.toLowerCase().startsWith('no')) {
              log.warn({}, 'unable to create short reply');
              return responseLong;
            }

            return Math.random() > 0.2 ? responseLongFormatted : finalAnswer;
          })();

          log.info(
            {
              long: responseLongFormatted,
              short: finalAnswer,
              metadata,
              response,
            },
            'Generated response',
          );
          return {
            longOutput: responseLongFormatted,
            refinedOutput: finalAnswer,
            metadata,
            response,
          };
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
