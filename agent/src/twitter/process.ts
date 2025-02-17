import {
  TWITTER_USERNAME,
  REJECTION_REASON,
  TEMPERATURE,
  SEED,
} from '../const';
import { inngest } from '../inngest';
import { NonRetriableError } from 'inngest';
import { getTweet, getTweetContentAsText } from './helpers.ts';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { PROMPTS } from './prompts.ts';
import { rejectedTweet, reportFailureToDiscord } from '../discord/action.ts';
import { logger } from '../logger.ts';
import { getTweetContext } from './execute.ts';

const openai = createOpenAI({
  compatibility: 'strict',
});

/**
 * Fetches tweets from the Twitter API and queues them for processing.
 */
export const processTweets = inngest.createFunction(
  {
    id: 'process-tweets',
    onFailure: async ({ event, error }) => {
      const id = event?.data?.event?.data?.id;
      const url = event?.data?.event?.data?.url;
      const log = logger.child({
        module: 'process-tweets',
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
          message: `[process-tweets]: unable to extract tweet ID or URL from event data. Run id: ${event.data.run_id}`,
        });
        return;
      }

      log.error(
        {
          reason: error.message,
        },
        'do no engage',
      );
      await rejectedTweet({
        tweetId: id,
        tweetUrl: url,
        reason: error.message,
      });
    },
    throttle: {
      limit: 100,
      period: '1m',
    },
  },
  { event: 'tweet.process' },
  async ({ event, step }) => {
    const log = logger.child({
      module: 'process-tweets',
      tweetId: event.data.id,
      eventId: event.id,
    });
    const tweetText = event.data.text;
    // This is where we can try to filter out any unwanted tweets

    const engagementSysPrompt = await PROMPTS.ENGAGEMENT_DECISION_PROMPT();

    /**
     * grab any tags to the bot
     * we only want a tag no nested tags inside threads for now
     */
    if (event.data.inReplyToId == null) {
      // deter scammers
      const shouldEngage = await step.run('should-engage', async () => {
        const text = await getTweetContentAsText({ id: event.data.id }, log);

        const result = await generateText({
          model: openai('o3-mini'),
          seed: SEED,
          temperature: TEMPERATURE,
          messages: [
            { role: 'system', content: engagementSysPrompt },
            {
              role: 'user',
              content: `Now give me a determination for this tweet: ${text}`,
            },
          ],
        });

        const decision = result.text.toLowerCase().trim();
        return decision === 'engage';
      });

      if (!shouldEngage) {
        throw new NonRetriableError(REJECTION_REASON.SPAM_DETECTED_ON_TAG);
      }

      // now we can send to execution job
      await step.sendEvent('fire-off-tweet', {
        name: 'tweet.execute',
        data: {
          tweetId: event.data.id,
          action: 'tag',
          tweetUrl: event.data.url,
        },
      });
      return;
    }

    // focus on replies bot gets anywhere to his tweet
    if (event.data?.inReplyToUsername === TWITTER_USERNAME) {
      const mainTweet = await getTweet({ id: event.data.inReplyToId! }).catch(
        e => {
          throw new NonRetriableError(e.message);
        },
      );

      // deter scammers
      const shouldEngage = await step.run('should-engage', async () => {
        const result = await generateText({
          model: openai('o3-mini'),
          seed: SEED,
          temperature: TEMPERATURE,
          messages: [
            { role: 'system', content: engagementSysPrompt },
            {
              role: 'assistant',
              content: mainTweet.text,
            },
            {
              role: 'user',
              content: `Now give me a determination for this tweet: ${tweetText}`,
            },
          ],
        });

        const decision = result.text.toLowerCase().trim();
        return decision === 'engage';
      });

      if (!shouldEngage) {
        throw new NonRetriableError(REJECTION_REASON.SPAM_DETECTED_ON_REPLY);
      }

      // now we can send to execution job
      await step.sendEvent('fire-off-tweet', {
        name: 'tweet.execute',
        data: {
          tweetId: event.data.id,
          action: 'reply',
          tweetUrl: event.data.url,
        },
      });
      return;
    }

    /**
     * Direct reply to thread
     * we try to figure out any tags to the bot
     *
     * If you wondering why we are not checking if we have tag
     * That's because we rely on our search filter to give us tweets which we want to engage with
     */
    if (event.data.inReplyToId == event.data.conversationId) {
      /**
       * Unlikely to happen at top level convos. Those are already handled in precedence
       * but in case if really nested convo invokes we disallow.
       *
       * Couldn't find a way we get this so a safety check in place.
       */
      if (event.data.inReplyToUsername === TWITTER_USERNAME) {
        throw new NonRetriableError(
          REJECTION_REASON.NO_TAG_ENGAGEMENT_TO_OWN_REPLY,
        );
      }

      // deter scammers
      const shouldEngage = await step.run('should-engage', async () => {
        const tweetThread = await getTweetContext({ id: event.data.id }, log);
        const _tweetReplyingTo = tweetThread.pop();
        const text = await getTweetContentAsText({ id: event.data.id }, log);
        const conversationContext = tweetThread.map(t => t.content).join('\n');

        const result = await generateText({
          model: openai('o3-mini'),
          seed: SEED,
          temperature: TEMPERATURE,
          messages: [
            { role: 'system', content: engagementSysPrompt },
            {
              role: 'user',
              content: `Given this "${conversationContext}" conversation give me a determination for the tweet: "${text}"`,
            },
          ],
        });

        const decision = result.text.toLowerCase().trim();
        return decision === 'engage';
      });

      if (!shouldEngage) {
        throw new NonRetriableError(
          REJECTION_REASON.SPAM_DETECTED_ON_TWEET_SUMMON,
        );
      }

      // now we can send to execution job
      await step.sendEvent('fire-off-tweet', {
        name: 'tweet.execute',
        data: {
          tweetId: event.data.id,
          action: 'tag-summon',
          tweetUrl: event.data.url,
        },
      });
      return;
    }

    throw new NonRetriableError(REJECTION_REASON.REPLY_SCOPE_LIMITED);
  },
);
