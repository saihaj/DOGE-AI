import {
  TWITTER_USERNAME,
  REJECTION_REASON,
  TEMPERATURE,
  SEED,
} from '../const';
import { inngest } from '../inngest';
import { NonRetriableError } from 'inngest';
import { getTweet } from './helpers.ts';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { PROMPTS } from './prompts.ts';
import { rejectedTweet, reportFailureToDiscord } from '../discord/action.ts';
import { logger } from '../logger.ts';

const openai = createOpenAI({
  compatibility: 'strict',
});

/**
 * Finds the parent tweet in a thread. If we hit the limit just give error.
 */
async function findParentTweet({ id }: { id: string }) {
  // Just to limit the number of tweets we fetch
  // if we go to this time to ignore that tweet for sure LOL
  const LIMIT = 20;
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

  if (tweets.length > LIMIT) {
    throw new NonRetriableError(REJECTION_REASON.TOO_DEEP_OF_A_THREAD);
  }

  const parentTweet = tweets[tweets.length - 1];

  return parentTweet;
}

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
    // This is where we can try to filter out any unwanted tweets

    // focus on replies bot gets anywhere to his tweet
    if (event.data?.inReplyToUsername === TWITTER_USERNAME) {
      const mainTweet = await getTweet({ id: event.data.inReplyToId! }).catch(
        e => {
          throw new NonRetriableError(e.message);
        },
      );

      // deter scammers
      const shouldEngage = await step.run('should-engage', async () => {
        const systemPrompt = await PROMPTS.ENGAGEMENT_DECISION_PROMPT();
        const result = await generateText({
          model: openai('gpt-4o'),
          seed: SEED,
          temperature: TEMPERATURE,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'assistant',
              content: mainTweet.text,
            },
            {
              role: 'user',
              content: `Now give me a determination for this tweet: ${event.data.text}`,
            },
          ],
        });

        const decision = result.text.toLowerCase().trim();
        return decision === 'engage';
      });

      if (!shouldEngage) {
        throw new NonRetriableError(
          REJECTION_REASON.SPAM_DETECTED_DO_NOT_ENGAGE,
        );
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
    } else {
      throw new NonRetriableError(REJECTION_REASON.REPLY_SCOPE_LIMITED);
    }
  },
);
