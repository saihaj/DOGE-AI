import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NonRetriableError } from 'inngest';
import {
  OPENAI_API_KEY,
  REJECTION_REASON,
  TEMPERATURE,
  TWITTER_USERNAME,
} from '../const.ts';
import {
  rejectedInteractionTweet,
  reportFailureToDiscord,
} from '../discord/action.ts';
import { inngest } from '../inngest.ts';
import { logger } from '../logger.ts';
import { tweetsProcessed, tweetsProcessingRejected } from '../prom.ts';
import { PROMPTS } from './prompts.ts';

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
  compatibility: 'strict',
});

export const processInteractionTweets = inngest.createFunction(
  {
    id: 'process-interaction-tweets',
    onFailure: async ({ event, error }) => {
      const id = event?.data?.event?.data?.id;
      const url = event?.data?.event?.data?.url;
      const log = logger.child({
        module: 'process-interaction-tweets',
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
          message: `[process-interaction-tweets]: unable to extract tweet ID or URL from event data. Run id: ${event.data.run_id}`,
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
        method: 'process-interaction-tweets',
        reason,
      });
      await rejectedInteractionTweet({
        tweetId: id,
        tweetUrl: url,
        reason: error.message,
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
  { event: 'tweet.process.interaction' },
  async ({ event, step }) => {
    const log = logger.child({
      module: 'process-interaction-tweets',
      tweetId: event.data.id,
      eventId: event.id,
    });
    log.info({}, 'processing interaction tweet');
    const tweetText = event.data.text;

    // Do not engage with tweets from the agent
    if (event.data.author.userName === TWITTER_USERNAME) {
      throw new NonRetriableError(
        REJECTION_REASON.ENGAGEMENT_RESTRICTED_ACCOUNT,
      );
    }

    const shouldEngage = await step.run('should-engage', async () => {
      const systemPrompt =
        await PROMPTS.INTERACTION_ENGAGEMENT_DECISION_PROMPT();
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
        name: 'tweet.execute.interaction',
        data: {
          tweetId: event.data.id,
          action: 'reply-engage',
          tweetUrl: event.data.url,
        },
      });
      tweetsProcessed.inc({
        method: 'process-interaction-tweets',
        action: 'reply-engage',
      });
      return;
    }

    if (typeof shouldEngage === 'string') {
      throw new NonRetriableError(shouldEngage);
    }
  },
);
