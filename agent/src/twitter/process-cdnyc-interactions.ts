import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NonRetriableError } from 'inngest';
import {
  DISCORD_CDNYC_REJECTED_CHANNEL_ID,
  OPENAI_API_KEY,
  REJECTION_REASON,
  TEMPERATURE,
} from '../const.ts';
import {
  rejectedInteractionTweet,
  reportFailureToDiscord,
} from '../discord/action.ts';
import { inngest } from '../inngest.ts';
import { logger } from '../logger.ts';
import { tweetsProcessed, tweetsProcessingRejected } from '../prom.ts';
import { getPromptContent } from '../controlplane-api/prompt-registry.ts';

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
  compatibility: 'strict',
});

const ID = 'process-cdnyc-inter-tweets';
const loggerBase = logger.child({ module: ID });

export const processCdnycInteractionTweets = inngest.createFunction(
  {
    id: ID,
    onFailure: async ({ event, error }) => {
      const id = event?.data?.event?.data?.id;
      const url = event?.data?.event?.data?.url;
      const log = loggerBase.child({
        tweetId: id,
        eventId: event.data.event.id,
      });

      if (!id || !url) {
        log.error(
          {
            event: event.data.event,
          },
          'failed to extract tweet id or url from event data',
        );
        await reportFailureToDiscord({
          message: `[${ID}]: unable to extract tweet ID or URL from event data. Run id: ${event.data.run_id}`,
        });
        return;
      }

      log.error(
        {
          reason: error.message,
        },
        'do no engage',
      );

      const reason = Object.values(REJECTION_REASON)
        .map(a => a.toLowerCase())
        .includes(error.message.toLowerCase())
        ? error.message
        : 'IGNORED';
      tweetsProcessingRejected.inc({
        method: ID,
        reason,
      });
      await rejectedInteractionTweet({
        tweetId: id,
        tweetUrl: url,
        reason: error.message,
        channelId: DISCORD_CDNYC_REJECTED_CHANNEL_ID,
      });
    },
    timeouts: {
      start: '10m',
    },
    throttle: {
      limit: 100,
      period: '1m',
    },
  },
  { event: 'tweet.process.cdnyc-interaction' },
  async ({ event, step }) => {
    const log = loggerBase.child({
      tweetId: event.data.id,
      eventId: event.id,
    });
    log.info({}, 'processing interaction tweet');
    const tweetText = event.data.text;

    const shouldEngage = await step.run('should-engage', async () => {
      const systemPrompt = await getPromptContent({
        key: 'ENGAGEMENT_DECISION_PROMPT',
        orgId: '94e4cbb7-0265-4f84-8c55-251ba424c09f',
      });
      const result = await generateText({
        model: openai('gpt-4.1-mini'),
        temperature: TEMPERATURE,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Now give me a determination for this tweet: ${tweetText}`,
          },
        ],
      });

      const decision = result.text.toLowerCase().trim().replace('.', ' ');

      if (decision === 'ignore') {
        log.warn(
          {
            decision,
          },
          'something went wrong. ignoring tweet',
        );
        throw Error('Need reason to ignore the tweet');
      }

      if (decision === 'no_question_detected') {
        log.warn(
          {
            decision,
          },
          'no question detected. re-run',
        );
        throw Error('weird no question detected. re-run');
      }

      log.info({ decision }, 'decision made');
      return decision.toLowerCase().startsWith('engage') ? true : result.text;
    });

    if (shouldEngage === true) {
      log.info({}, 'queuing tweet for engagement');
      await step.sendEvent('fire-off-tweet', {
        name: 'tweet.execute.cdnyc-interaction',
        data: {
          tweetId: event.data.id,
          action: 'reply-engage',
          tweetUrl: event.data.url,
        },
      });
      tweetsProcessed.inc({
        method: ID,
        action: 'reply-engage',
      });
      return;
    }

    if (typeof shouldEngage === 'string') {
      throw new NonRetriableError(shouldEngage);
    }
  },
);
