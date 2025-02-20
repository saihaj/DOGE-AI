import { IS_PROD, REJECTION_REASON, SEED, TEMPERATURE } from '../const';
import { inngest } from '../inngest';
import { NonRetriableError } from 'inngest';
import {
  generateEmbeddings,
  getTweet,
  getTweetContentAsText,
  highPriorityUser,
  longResponseFormatter,
  mergeConsecutiveSameRole,
  sanitizeLlmOutput,
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
  rejectedTweet,
  reportFailureToDiscord,
  sendDevTweet,
} from '../discord/action.ts';
import { twitterClient } from './client.ts';
import { logger, WithLogger } from '../logger.ts';
import { perplexity } from '@ai-sdk/perplexity';
import { getKbContext } from './knowledge-base.ts';

export async function generateReply({
  messages,
  systemPrompt,
}: {
  messages: CoreMessage[];
  systemPrompt?: string;
}) {
  const mergedMessages = mergeConsecutiveSameRole(messages);
  if (!systemPrompt) {
    systemPrompt = await PROMPTS.TWITTER_REPLY_TEMPLATE();
  }
  const { text: _text, experimental_providerMetadata } = await generateText({
    temperature: TEMPERATURE,
    model: perplexity('sonar-reasoning'),
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...mergedMessages,
    ],
  });

  const metadata = experimental_providerMetadata
    ? JSON.stringify(experimental_providerMetadata)
    : null;

  const text = sanitizeLlmOutput(_text);

  const formatted = await longResponseFormatter(text);

  return {
    text,
    metadata,
    formatted,
  };
}

export async function generateShortenedReply({ message }: { message: string }) {
  const PROMPT = await PROMPTS.REPLY_SHORTENER_PROMPT();
  const { text: _text } = await generateText({
    temperature: TEMPERATURE,
    model: openai('gpt-4o'),
    messages: [
      {
        role: 'system',
        content: PROMPT,
      },
      {
        role: 'user',
        content: `now shorten this one: ${message}`,
      },
    ],
  });

  const text = sanitizeLlmOutput(_text);

  return {
    text,
  };
}

/**
 * given a tweet id, we try to follow the full thread up to a certain limit.
 */
export async function getTweetContext(
  {
    id,
  }: {
    id: string;
  },
  logger: WithLogger,
): Promise<Array<CoreMessage>> {
  const LIMIT = 3;
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
      throw new NonRetriableError(REJECTION_REASON.MAX_THREAD_DEPTH_REACHED);
    }

    // extract tweet text
    const content = await getTweetContentAsText({ id: tweet.id }, logger);

    tweets.push({
      // Bot tweets are always assistant but
      // we use `user` because pplx is very strict and doesn't work with `assistant` nicely
      role: 'user',
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
      const url = event?.data?.event?.data?.tweetUrl;
      const log = logger.child({
        module: 'execute-tweets',
        tweetId: id,
        eventId: event.data.event.id,
      });
      const errorMessage = error.message;

      log.error({ error: errorMessage }, 'Failed to execute tweets');

      const nonFatalError =
        errorMessage
          .toLowerCase()
          .startsWith(REJECTION_REASON.NO_QUESTION_DETECTED.toLowerCase()) ||
        errorMessage
          .toLowerCase()
          .startsWith(REJECTION_REASON.MAX_THREAD_DEPTH_REACHED.toLowerCase());

      if (nonFatalError) {
        await rejectedTweet({
          tweetId: id,
          tweetUrl: url,
          reason: errorMessage,
        });
        return;
      }

      await reportFailureToDiscord({
        message: `[execute-tweets]:${id} ${errorMessage}`,
      });
    },
    throttle: {
      limit: 25,
      period: '15m',
    },
  },
  { event: 'tweet.execute' },
  async ({ event, step }) => {
    const log = logger.child({
      module: 'execute-tweets',
      tweetId: event.data.tweetId,
      eventId: event.id,
    });

    const dbChat = await step.run('check-db', async () => {
      // skip for local testing
      if (!IS_PROD) return;

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

    // Yes you can get the full context here but
    // this is optimization to avoid fetching too much
    // in case we just reject it
    const tweetToActionOn = await getTweet({
      id: event.data.tweetId,
    }).catch(e => {
      log.error({ error: e }, 'Unable to get tweet to action on');
      throw new NonRetriableError(e);
    });

    const question = await step.run('extract-question', async () => {
      const tweetText = tweetToActionOn.text;

      const { text: extractedQuestion } = await generateText({
        model: openai('gpt-4o'),
        temperature: TEMPERATURE,
        seed: SEED,
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

      if (extractedQuestion.startsWith(REJECTION_REASON.NO_QUESTION_DETECTED)) {
        log.error({}, 'no question found');
        throw new NonRetriableError(REJECTION_REASON.NO_QUESTION_DETECTED);
      }

      return extractedQuestion;
    });

    const reply = await (async () => {
      switch (event.data.action) {
        case 'reply': {
          const reply = await step.run('generate-reply', async () => {
            const messages: Array<CoreMessage> = [];
            const tweetThread = await getTweetContext(
              { id: tweetToActionOn.id },
              log,
            );
            const tweetWeRespondingTo = tweetThread.pop();

            if (!tweetWeRespondingTo) {
              log.error({}, 'no tweet found to reply');
              throw new NonRetriableError(
                REJECTION_REASON.NO_TWEET_FOUND_TO_REPLY_TO,
              );
            }

            const kb = await getKbContext(
              {
                messages: [...tweetThread, tweetWeRespondingTo],
                text: question,
              },
              log,
            );

            if (kb?.bill) {
              log.info(kb.bill, 'bill found');
            }

            const summary = kb?.bill
              ? `${kb.bill.title}: \n\n${kb.bill.content}`
              : '';

            if (kb?.documents) {
              messages.push({
                role: 'user',
                content: `Documents Context: ${kb.documents}\n\n`,
              });
            }

            if (summary) {
              messages.push({
                role: 'user',
                content: `Bills Context: ${summary}\n\n`,
              });
            }

            const fullContext = tweetThread
              .map(({ content }) => content)
              .join('\n\n');
            const previousTweet =
              tweetThread?.[tweetThread.length - 1]?.content.toString() || '';
            const content = await PROMPTS.REPLY_TWEET_QUESTION_PROMPT({
              question,
              lastDogeReply: previousTweet,
              fullContext,
            });
            messages.push({
              role: 'user',
              content,
            });
            messages.push({
              role: 'user',
              content: `now answer this question: "${question}"`,
            });

            log.info(messages, 'context given');
            const {
              text: long,
              metadata,
              formatted,
            } = await generateReply({ messages });
            log.info({ response: long, metadata }, 'reply generated');

            return {
              text: formatted,
              metadata,
            };
          });

          return reply;
        }
        case 'tag-summon':
        case 'tag': {
          const reply = await step.run('generate-reply', async () => {
            const PROMPT = await PROMPTS.TWITTER_REPLY_TEMPLATE();
            const messages: Array<CoreMessage> = [
              {
                role: 'system',
                content: PROMPT,
              },
            ];

            const tweetThread = await getTweetContext(
              { id: tweetToActionOn.id },
              log,
            );

            const tweetText = await getTweetContentAsText(
              { id: tweetToActionOn.id },
              logger,
            );

            const kb = await getKbContext(
              {
                messages: tweetThread,
                text: tweetText,
              },
              log,
            );

            // we remove that so we can just focus on the question
            const _tweetWeRespondingTo = tweetThread.pop();

            if (kb?.bill) {
              log.info(kb.bill, 'bill found');
            }

            const summary = kb?.bill
              ? `${kb.bill.title}: \n\n${kb.bill.content}`
              : '';

            if (kb?.documents) {
              messages.push({
                role: 'user',
                content: `Documents Context: ${kb.documents}\n\n`,
              });
            }

            if (summary) {
              messages.push({
                role: 'user',
                content: `Bills Context: ${summary}\n\n`,
              });
            }

            const fullContext = tweetThread
              .map(({ content }) => content)
              .join('\n\n');
            const previousTweet =
              tweetThread?.[tweetThread.length - 1]?.content.toString() || '';
            const input = await PROMPTS.REPLY_TWEET_QUESTION_PROMPT({
              question: tweetText,
              lastDogeReply: previousTweet,
              fullContext,
            });
            messages.push({
              role: 'user',
              content: input,
            });
            messages.push({
              role: 'user',
              content: `now answer this question: "${tweetText}"`,
            });

            const { text: _long } = await generateText({
              temperature: TEMPERATURE,
              model: openai('gpt-4o'),
              messages,
            });

            const long = sanitizeLlmOutput(_long);
            const formatted = await longResponseFormatter(long);

            return {
              text: formatted,
              long: formatted,
              metadata: null,
            };
          });

          return reply;
        }
        default: {
          throw new NonRetriableError(REJECTION_REASON.ACTION_NOT_SUPPORTED);
        }
      }
    })();

    const repliedTweet = await step.run('send-tweet', async () => {
      // Locally we don't want to send anything to Twitter
      if (!IS_PROD) {
        await sendDevTweet({
          tweetUrl: `https://x.com/i/status/${tweetToActionOn.id}`,
          question,
          priority: highPriorityUser(tweetToActionOn.author.userName),
          response: reply.text,
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
        sentTweetUrl: `https://x.com/i/status/${repliedTweet.id}`,
        replyTweetUrl: tweetToActionOn.url,
        priority: highPriorityUser(tweetToActionOn.author.userName),
        sent: reply.text,
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
            meta: Buffer.from(
              JSON.stringify({ eventAction: event.data.action }),
            ),
          },
          {
            id: crypto.randomUUID(),
            text: reply.text,
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
        textSplitter.splitText(reply.text),
      ]);

      const actionTweetEmbeddings = await generateEmbeddings(chunkActionTweet);

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
  },
);
