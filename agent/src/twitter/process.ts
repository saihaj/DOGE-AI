import { z } from 'zod';
import { bento } from '../cache.ts';
import {
  TWITTER_API_BASE_URL,
  TWITTER_API_KEY,
  TWITTER_USERNAME,
  REJECTION_REASON,
  DISCORD_SERVER_URL,
} from '../const';
import { inngest, TweetResponse } from '../inngest';
import { NonRetriableError } from 'inngest';
import { getTweet } from './helpers.ts';

/**
 * Fetches tweets from the Twitter API and queues them for processing.
 */
export const processTweets = inngest.createFunction(
  {
    id: 'process-tweets',
    onFailure: async ({ event, error }) => {
      const id = event?.data?.event?.data?.id;
      const url = event?.data?.event?.data?.url;

      if (!id || !url) {
        console.error('Failed to extract tweet ID or URL from event data');
        return;
      }

      try {
        await fetch(`${DISCORD_SERVER_URL}/rejected`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            url,
            reason: error.message,
          }),
        });
      } catch (err) {
        console.error('Failed to send rejection to Discord:', err);
      }

      console.log('Failed to process tweet:', error.message);
    },
  },
  { event: 'tweet.process' },
  async ({ event, step }) => {
    // This is where we can try to filter out any unwanted tweets

    // For stage one rollout we want to focus on processing replies in a thread it gets
    if (event.data?.inReplyToUsername === TWITTER_USERNAME) {
      const mainTweet = await getTweet({ id: event.data.inReplyToId }).catch(
        e => {
          throw new NonRetriableError(e.message);
        },
      );

      // basically we are narrowing down to 1 level replies so if a bot tweet got a reply or not
      if (mainTweet.author.id === event.data.inReplyToUserId) {
        // deter scammers
        const shouldEngage = await step.run('should-engage', () => {
          // We can add any logic here to determine if we should engage with the tweet
          // For example, we can check if the tweet is a question, or if it contains a specific keyword
          // For now, we will engage with all tweets
          return true;
        });

        if (!shouldEngage) {
          throw new NonRetriableError(
            REJECTION_REASON.SPAM_DETECTED_DO_NOT_ENGAGE,
          );
        }

        // now we can send to execution job
        step.sendEvent('fire-off-tweet', {
          name: 'tweet.execute',
          data: {
            tweetId: event.data.id,
            action: 'reply',
            tweetUrl: event.data.url,
          },
        });
      } else {
        throw new NonRetriableError(
          REJECTION_REASON.NESTED_REPLY_NOT_SUPPORTED,
        );
      }
    } else {
      throw new NonRetriableError(REJECTION_REASON.REPLY_SCOPE_LIMITED);
    }
  },
);
