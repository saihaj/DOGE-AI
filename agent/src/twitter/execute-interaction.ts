import { anthropic } from '@ai-sdk/anthropic';
import { createDeepInfra } from '@ai-sdk/deepinfra';
import { createOpenAI } from '@ai-sdk/openai';
import {
  APICallError,
  CoreMessage,
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from 'ai';
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
  DEEPINFRA_API_KEY,
  DISCORD_APPROVED_CHANNEL_ID,
  DISCORD_REJECTED_CHANNEL_ID,
  IS_PROD,
  OPENAI_API_KEY,
  REJECTION_REASON,
  SEED,
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
  rejectReasoning,
  sanitizeLlmOutput,
  upsertChat,
  upsertUser,
} from './helpers.ts';
import { getKbContext } from './knowledge-base.ts';
import { getSearchResult } from './web.ts';

const deepinfra = createDeepInfra({
  apiKey: DEEPINFRA_API_KEY,
});

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
  compatibility: 'strict',
});

/**
 * Given summary of and text of tweet generate a long contextual response
 */
export async function getLongResponse(
  {
    summary,
    text,
    systemPrompt,
    prefixPrompt,
  }: {
    summary: string;
    text: string;
    systemPrompt?: string;
    prefixPrompt?: string;
  },
  { method, log, action }: { log: WithLogger; method: string; action: string },
) {
  if (!systemPrompt) {
    systemPrompt = await getPromptContent({
      key: 'TWITTER_REPLY_USING_KB',
      orgId: '43e671ed-a66c-4c40-b461-6d5c18f0effb',
    });
  }

  if (!prefixPrompt) {
    prefixPrompt = await getPromptContent({
      key: 'REPLY_AS',
      orgId: '43e671ed-a66c-4c40-b461-6d5c18f0effb',
    });
  }

  const webSearchResults = await getSearchResult(
    {
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
    },
    log,
  );

  const messages = [
    {
      role: 'system',
      content: systemPrompt,
    },
  ] as CoreMessage[];

  if (summary) {
    messages.push({ role: 'user', content: summary });
  }

  const webResult = webSearchResults
    ?.map(
      result =>
        `Title: ${result.title}\nURL: ${result.url}\n\n Published Date: ${result.publishedDate}\n\n Content: ${result.text}\n\n`,
    )
    .join('');

  const sources =
    webSearchResults?.map(result => ({
      url: result.url,
      title: result.title,
      publishedDate: result.publishedDate,
    })) || [];

  if (webResult) {
    messages.push({
      role: 'user',
      content: `Web search results:\n\n${webResult}`,
    });
  }

  messages.push({
    role: 'user',
    content: `${prefixPrompt} "${text}"`,
  });

  const { text: _responseLong, reasoning } = await generateText({
    temperature: TEMPERATURE,
    seed: SEED,
    model: wrapLanguageModel({
      model: deepinfra('deepseek-ai/DeepSeek-R1'),
      middleware: [
        extractReasoningMiddleware({
          tagName: 'think',
        }),
      ],
    }),
    messages: messages,
    experimental_generateMessageId: crypto.randomUUID,
    maxRetries: 0,
  }).catch(e => {
    if (APICallError.isInstance(e)) {
      if (e.message.includes('exceeds maximum input length')) {
        log.error({ error: e.message }, 'input too large for model');
        throw new NonRetriableError(REJECTION_REASON.INPUT_TOO_LARGE_FOR_MODEL);
      }
    }
    throw e;
  });

  const metadata = sources.length > 0 ? JSON.stringify(sources) : null;

  log.info({ reasoning }, 'reasoning');
  log.info({ response: _responseLong }, 'raw long response');

  const responseLong = sanitizeLlmOutput(_responseLong);
  const hasReasoning = rejectReasoning(responseLong);

  if (hasReasoning) {
    log.error(
      { response: responseLong, reasoning },
      'response contains reasoning, rejecting',
    );
    throw new NonRetriableError(REJECTION_REASON.CONTAINS_REASONING);
  }

  const formatted = await longResponseFormatter(responseLong);
  log.info({ response: formatted }, 'formatted long response');
  return {
    raw: responseLong,
    formatted,
    metadata,
  };
}

async function engageShareChatPrompt({
  share,
  message,
}: {
  share: string;
  message: string;
}) {
  const prompt = await getPromptContent({
    key: 'ENGAGE_SHARE_CHAT',
    orgId: '43e671ed-a66c-4c40-b461-6d5c18f0effb',
  });
  const templatedPrompt = Handlebars.compile(prompt);
  return templatedPrompt({ share, message });
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
    refinePrompt = await getPromptContent({
      key: 'REPLY_SHORTENER_PROMPT',
      orgId: '43e671ed-a66c-4c40-b461-6d5c18f0effb',
    });
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

      const nonFatalError = [
        REJECTION_REASON.CONTAINS_REASONING,
        REJECTION_REASON.INPUT_TOO_LARGE_FOR_MODEL,
        REJECTION_REASON.NO_QUESTION_DETECTED,
      ].some(reason =>
        errorMessage.toLowerCase().startsWith(reason.toLowerCase()),
      );

      if (nonFatalError) {
        tweetsProcessingRejected.inc({
          method: 'execute-interaction-tweets',
          reason: errorMessage,
        });
        await rejectedTweet({
          tweetId: id,
          tweetUrl: url,
          reason: errorMessage,
          channelId: DISCORD_REJECTED_CHANNEL_ID,
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
      limit: 1,
      period: '15s',
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
              manualEntries: {
                orgId: '43e671ed-a66c-4c40-b461-6d5c18f0effb',
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
            const { raw, metadata, formatted } = await getLongResponse(
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
                response: formatted,
                metadata,
              },
              'generated response',
            );

            // 90% of the time we return the long output, 10% of the time we return the short output
            // const returnLong = Math.random() > 0.1;
            const returnLong = true;

            if (returnLong) {
              log.info({}, 'returning long');

              // Inject it 40% of the time
              const injectShare = Math.random() < 0.4;

              const shareMessage = injectShare
                ? await (async () => {
                    const shareUrl = `https//dogeai.chat/t/${tweetToActionOn.id}?utm_source=twitter&utm_medium=dogeai_gov&utm_campaign=${event.data.action}`;
                    log.info({ url: shareUrl }, 'generating share message');

                    const formatSharePrompt = await engageShareChatPrompt({
                      message: formatted,
                      share: shareUrl,
                    });

                    const { text: shareUrlMessage } = await generateText({
                      model: openai('gpt-4.1'),
                      temperature: TEMPERATURE,
                      seed: SEED,
                      messages: [
                        { role: 'system', content: formatSharePrompt },
                        {
                          role: 'user',
                          content: formatted,
                        },
                      ],
                    });

                    log.info(
                      { message: shareUrlMessage },
                      'generated share message',
                    );

                    return shareUrlMessage;
                  })()
                : null;

              return {
                // Implicitly we are returning the long output so others can be ignored
                longOutput: '',
                refinedOutput: '',
                metadata,
                response: formatted,
                shareMessage,
              };
            }

            const finalAnswer = await getShortResponse({ topic: raw });
            log.info({ response: finalAnswer }, 'generated short');

            // some times claude safety kicks in and we get a NO
            if (finalAnswer.toLowerCase().startsWith('no')) {
              log.warn({}, 'claude safety kicked in. returning long');
              return {
                // Implicitly we are returning the long output so others can be ignored
                longOutput: '',
                refinedOutput: '',
                metadata,
                response: formatted,
                shareMessage: null,
              };
            }

            return {
              longOutput: formatted,
              refinedOutput: finalAnswer,
              metadata,
              response: finalAnswer,
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
            tweetProcessingTime.observe(
              { method: 'execute-interaction-tweets' },
              timeElapsed,
            );
            tweetsPublished.inc({
              action: event.data.action,
              method: 'execute-interaction-tweets',
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
            channelId: DISCORD_APPROVED_CHANNEL_ID,
            sent: content,
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
