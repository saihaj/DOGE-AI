import { z } from 'zod';
import { bento } from '../cache.ts';
import {
  TWITTER_API_BASE_URL,
  TWITTER_API_KEY,
  TWITTER_USERNAME,
} from '../const';
import { inngest, TweetResponse } from '../inngest';
import { NonRetriableError } from 'inngest';

const REJECTION_REASON = {
  REPLY_SCOPE_LIMITED: 'REPLY_SCOPE_LIMITED',
  NO_TWEET_RETRIEVED: 'NO_TWEET_RETRIEVED',
  FAILED_TO_PARSE_RESPONSE: 'FAILED_TO_PARSE_RESPONSE',
  NESTED_REPLY_NOT_SUPPORTED: 'NESTED_REPLY_NOT_SUPPORTED',
} as const;

const API = new URL(TWITTER_API_BASE_URL);
API.pathname = '/twitter/tweets';
const GetTweetResponse = z.object({
  tweets: z.array(TweetResponse),
});

/**
 * Fetches tweets from the Twitter API and queues them for processing.
 */
export const processTweets = inngest.createFunction(
  {
    id: 'process-tweets',
    onFailure: ({ error }) => {
      // TODO: send to discord
      console.log('Failed to process tweet', error.message);
    },
  },
  { event: 'tweet.process' },
  async ({ event, step }) => {
    // This is where we can try to filter out any unwanted tweets

    // For stage one rollout we want to focus on processing replies in a thread it gets
    if (event.data?.inReplyToUsername === TWITTER_USERNAME) {
      // grab the main tweet
      const mainTweet = await bento.getOrSet(
        `/tweet/${event.data.inReplyToId}`,
        async () => {
          API.searchParams.set('tweet_ids', event.data.inReplyToId);

          const data = await fetch(`${API.toString()}`, {
            headers: {
              'X-API-Key': TWITTER_API_KEY,
            },
          });

          const json = await data.json();
          const tweet = await GetTweetResponse.safeParseAsync(json);
          if (tweet.error) {
            throw new Error(REJECTION_REASON.FAILED_TO_PARSE_RESPONSE, {
              cause: tweet.error.message,
            });
          }

          // Likely can happen if the tweet was deleted
          if (tweet.data.tweets.length === 0) {
            throw new NonRetriableError(REJECTION_REASON.NO_TWEET_RETRIEVED);
          }

          return tweet.data.tweets[0];
        },
      );

      // basically we are narrowing down to 1 level replies so if a bot tweet got a reply or not
      if (mainTweet.author.id === event.data.inReplyToUserId) {
        // now we can send to execution job
        step.sendEvent('fire-off-tweet', {
          name: 'tweet.execute',
          data: {
            tweetId: event.data.id,
            action: 'reply',
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
