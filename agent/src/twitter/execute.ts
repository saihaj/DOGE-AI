import { openai } from '@ai-sdk/openai';
import { perplexity } from '@ai-sdk/perplexity';
import { CoreMessage, generateText } from 'ai';
import {
  chat as chatDbSchema,
  db,
  eq,
  message as messageDbSchema,
} from 'database';
import Handlebars from 'handlebars';
import { NonRetriableError } from 'inngest';
import * as crypto from 'node:crypto';
import {
  DISCORD_APPROVED_CHANNEL_ID,
  DISCORD_REJECTED_CHANNEL_ID,
  IS_PROD,
  OPENAI_API_KEY,
  REJECTION_REASON,
  TEMPERATURE,
} from '../const';
import { getPromptContent } from '../controlplane-api/prompt-registry.ts';
import {
  approvedTweetEngagement,
  rejectedTweet,
  reportFailureToDiscord,
  sendDevTweet,
} from '../discord/action.ts';
import { inngest } from '../inngest';
import { logger, WithLogger } from '../logger.ts';
import {
  tweetProcessingTime,
  tweetPublishFailed,
  tweetsProcessingRejected,
  tweetsPublished,
} from '../prom.ts';
import { twitterClient } from './client.ts';
import {
  getTimeInSecondsElapsedSinceTweetCreated,
  getTweet,
  getTweetContentAsText,
  longResponseFormatter,
  mergeConsecutiveSameRole,
  questionExtractor,
  rejectReasoning,
  sanitizeLlmOutput,
  upsertChat,
  upsertUser,
} from './helpers.ts';
import { getKbContext } from './knowledge-base.ts';

export async function generateReply(
  {
    messages,
    systemPrompt,
  }: {
    messages: CoreMessage[];
    systemPrompt?: string;
  },
  { method, log, action }: { log: WithLogger; method: string; action: string },
) {
  const mergedMessages = mergeConsecutiveSameRole(messages);
  if (!systemPrompt) {
    systemPrompt = await getPromptContent({
      key: 'REPLY_TEMPLATE',
      orgId: '43e671ed-a66c-4c40-b461-6d5c18f0effb',
    });
  }
  const { text: _text, sources } = await generateText({
    temperature: TEMPERATURE,
    model: perplexity('sonar-reasoning-pro'),
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...mergedMessages,
    ],
    maxRetries: 0,
  });

  const metadata = sources.length > 0 ? JSON.stringify(sources) : null;

  const text = sanitizeLlmOutput(_text);

  const hasReasoning = rejectReasoning(text);
  if (hasReasoning) {
    log.error({ response: text }, 'response contains reasoning, rejecting');
    throw new NonRetriableError(REJECTION_REASON.CONTAINS_REASONING);
  }

  const formatted = await longResponseFormatter(text);

  return {
    text,
    metadata,
    formatted,
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
  const LIMIT = 7;
  let tweets: Array<CoreMessage> = [];

  let searchId: null | string = id;
  do {
    const tweet = await getTweet({ id: searchId, logger });

    if (tweet.inReplyToId) {
      searchId = tweet.inReplyToId;
    }

    if (!tweet.inReplyToId) {
      searchId = null;
    }

    // Limit max tweets
    if (tweets.length > LIMIT) {
      searchId = null;
      logger.error({ limit: LIMIT }, 'max thread depth reached');
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

export async function getReplyTweetQuestionPrompt({
  question,
  lastDogeReply,
  fullContext,
}: {
  question: string;
  lastDogeReply: string;
  fullContext: string;
}) {
  const prompt = await getPromptContent({
    key: 'REPLY_TWEET_QUESTION_PROMPT',
    orgId: '43e671ed-a66c-4c40-b461-6d5c18f0effb',
  });
  const templatedPrompt = Handlebars.compile(prompt);
  return templatedPrompt({ question, lastDogeReply, fullContext });
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

      const nonFatalError = [
        REJECTION_REASON.CONTAINS_REASONING,
        REJECTION_REASON.INPUT_TOO_LARGE_FOR_MODEL,
        REJECTION_REASON.MAX_THREAD_DEPTH_REACHED,
        REJECTION_REASON.NO_QUESTION_DETECTED,
      ].some(reason =>
        errorMessage.toLowerCase().startsWith(reason.toLowerCase()),
      );

      if (nonFatalError) {
        tweetsProcessingRejected.inc({
          reason: errorMessage,
          method: 'execute-tweets',
        });
        await rejectedTweet({
          tweetId: id,
          tweetUrl: url,
          reason: errorMessage,
          channelId: DISCORD_REJECTED_CHANNEL_ID,
        });
        return;
      }

      tweetPublishFailed.inc({
        method: 'execute-tweets',
      });
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
      logger: log,
    }).catch(e => {
      log.error({ error: e }, 'Unable to get tweet to action on');
      throw new NonRetriableError(e);
    });

    const question = await step.run('extract-question', async () => {
      const tweetText = tweetToActionOn.text;

      const extractedQuestion = await questionExtractor({
        role: 'user',
        content: tweetText,
      });

      if (extractedQuestion.startsWith(REJECTION_REASON.NO_QUESTION_DETECTED)) {
        log.error({}, 'no question found');
        throw new NonRetriableError(REJECTION_REASON.NO_QUESTION_DETECTED);
      }

      log.info({ question: extractedQuestion }, 'question extracted');

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
                billEntries: true,
                documentEntries: true,
                manualEntries: false,
                openaiApiKey: OPENAI_API_KEY,
              },
              log,
            );

            if (kb?.bill) {
              log.info(
                {
                  id: kb.bill.id,
                  title: kb.bill.title,
                },
                'bill found',
              );
            }

            const summary = kb?.bill
              ? `${kb.bill.title}: \n\n${kb.bill.content}`
              : '';

            if (kb?.documents) {
              log.info({}, 'documents injected into context');
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
            const content = await getReplyTweetQuestionPrompt({
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
            } = await generateReply(
              { messages },
              {
                log,
                method: 'execute-tweets',
                action: event.data.action,
              },
            );
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
            const PROMPT = await getPromptContent({
              key: 'REPLY_TEMPLATE',
              orgId: '43e671ed-a66c-4c40-b461-6d5c18f0effb',
            });
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
                billEntries: true,
                documentEntries: true,
                manualEntries: false,
                openaiApiKey: OPENAI_API_KEY,
              },
              log,
            );

            // we remove that so we can just focus on the question
            const _tweetWeRespondingTo = tweetThread.pop();

            if (kb?.bill) {
              log.info(
                {
                  id: kb.bill.id,
                  title: kb.bill.title,
                },
                'bill found',
              );
            }

            const summary = kb?.bill
              ? `${kb.bill.title}: \n\n${kb.bill.content}`
              : '';

            if (kb?.documents) {
              log.info({}, 'documents injected into context');
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
            const input = await getReplyTweetQuestionPrompt({
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
          response: reply.text,
        });
        return {
          id: 'local_id',
        };
      }

      try {
        const response = await twitterClient.v2.tweet(reply.text, {
          reply: {
            in_reply_to_tweet_id: tweetToActionOn.id,
          },
        });
        const timeElapsed =
          getTimeInSecondsElapsedSinceTweetCreated(tweetToActionOn);
        log.info({ response, deltaSeconds: timeElapsed }, 'tweet sent');
        tweetProcessingTime.observe({ method: 'execute-tweets' }, timeElapsed);
        tweetsPublished.inc({
          action: event.data.action,
          method: 'execute-tweets',
        });

        return {
          id: response.data.data.id,
        };
      } catch (error) {
        log.error({ error }, 'failed to send tweet');
        throw new NonRetriableError(error as any);
      }
    });

    await step.run('notify-discord', async () => {
      // No need to send to discord in local mode since we are already spamming dev test channel
      if (!IS_PROD) return;

      await approvedTweetEngagement({
        sentTweetUrl: `https://x.com/i/status/${repliedTweet.id}`,
        replyTweetUrl: tweetToActionOn.url,
        channelId: DISCORD_APPROVED_CHANNEL_ID,
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
        })
        .get();
    });
  },
);
