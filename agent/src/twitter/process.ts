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
  async ({ event }) => {
    // For stage one rollout we want to focus on processing replies in a thread it gets
    if (event.data?.inReplyToUsername === TWITTER_USERNAME) {
      // grab the main tweet
      const mainTweet = await bento.getOrSet(
        `/tweet/${event.data.inReplyToId}`,
        async () => {
          API.searchParams.set('tweet_ids', '!');

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

      console.log('Processing reply tweet', event);
    } else {
      throw new NonRetriableError(REJECTION_REASON.REPLY_SCOPE_LIMITED);
    }
  },
);
