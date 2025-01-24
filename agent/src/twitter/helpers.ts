import { z } from 'zod';
import {
  REJECTION_REASON,
  TWITTER_API_BASE_URL,
  TWITTER_API_KEY,
} from '../const';
import { TweetResponse } from '../inngest';
import { bento } from '../cache';

const API = new URL(TWITTER_API_BASE_URL);

const GetTweetResponse = z.object({
  tweets: z.array(TweetResponse),
});

export async function getTweet({ id }: { id: string }) {
  API.pathname = '/twitter/tweets';
  return bento.getOrSet(`/tweet/${id}`, async () => {
    API.searchParams.set('tweet_ids', id);

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
      throw new Error(REJECTION_REASON.NO_TWEET_RETRIEVED);
    }

    return tweet.data.tweets[0];
  });
}
