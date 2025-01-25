import {
  TWITTER_API_BASE_URL,
  TWITTER_API_KEY,
  TWITTER_USERNAME,
} from '../const';
import { inngest, TweetResponse } from '../inngest';
import { z } from 'zod';
import { chunk } from 'lodash-es';

const API = new URL(TWITTER_API_BASE_URL);
API.pathname = '/twitter/tweet/advanced_search';

const SearchResultResponseSchema = z.object({
  tweets: z.array(TweetResponse),
  has_next_page: z.boolean(),
  next_cursor: z.string().nullable(),
});

const USERNAME = '@dogeai_gov';

/**
 * Fetches tweets from the Twitter API and queues them for processing.
 */
export const ingestTweets = inngest.createFunction(
  {
    id: 'ingest-tweets',
    // TODO: set an alert to notify you if the function fails
    onFailure: () => {},
  },
  //   Runs every 5 minutes
  { cron: '30 * * * *' },
  async () => {
    /**
     * Search for all the tweets for the bot and not it's own tweets
     * within the last 24 hours.
     *
     * Learn more about syntax here: https://github.com/igorbrigadir/twitter-advanced-search
     */
    const searchQuery = `@${USERNAME} -from:${USERNAME} within_time:1d`;
    API.searchParams.set('query', searchQuery);
    API.searchParams.set('queryType', 'Latest');

    let tweets: z.infer<typeof SearchResultResponseSchema>['tweets'] = [];
    let cursor = '';
    API.searchParams.set('cursor', cursor);

    do {
      const response = await fetch(API.toString(), {
        method: 'GET',
        headers: {
          'X-API-Key': TWITTER_API_KEY,
        },
      });
      const data = await response.json();

      const result = await SearchResultResponseSchema.safeParseAsync(data);

      if (result.success === false) {
        throw new Error(result.error.errors.join(', '));
      }

      tweets = tweets.concat(result.data.tweets);
      cursor = result.data.next_cursor || '';
      API.searchParams.set('cursor', cursor);

      // If there are no more tweets to fetch, break out of the loop
      if (!result.data.has_next_page) {
        break;
      }
    } while (cursor);

    /**
     * There is a limit of 512KB for batching events. To avoid hitting this limit, we chunk the tweets
     * https://www.inngest.com/docs/events#sending-multiple-events-at-once
     */
    const chunkTweets = chunk(tweets, 5);

    chunkTweets.forEach(async chunk => {
      const inngestSent = await inngest.send(
        chunk.map(tweet => ({ name: 'tweet.process', data: tweet })),
      );

      console.log(`Sent ${inngestSent.ids.length} tweets to inngest`);
    });
  },
);
