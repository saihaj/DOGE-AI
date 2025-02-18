import {
  TWITTER_API_BASE_URL,
  TWITTER_API_KEY,
  TWITTER_USERNAME,
} from '../const';
import { inngest, TweetResponse } from '../inngest';
import { z } from 'zod';
import { chunk } from 'lodash-es';
import { reportFailureToDiscord } from '../discord/action';
import { SearchResultResponseSchema } from './helpers';
import { logger } from '../logger';

const API = new URL(TWITTER_API_BASE_URL);
API.pathname = '/twitter/tweet/advanced_search';

const log = logger.child({ module: 'ingest-tweets' });

/**
 * Fetches tweets from the Twitter API and queues them for processing.
 */
export const ingestTweets = inngest.createFunction(
  {
    id: 'ingest-tweets',
    onFailure: async ({ error }) => {
      const errorMessage = error.message;
      log.error({ error: errorMessage }, 'Failed to ingest tweets');
      await reportFailureToDiscord({
        message: `[ingest-tweets]: ${errorMessage}`,
      });
    },
  },
  // Runs every 5 minutes
  { cron: '*/5 * * * *' },
  async () => {
    /**
     * Search for all the tweets for the bot and not it's own tweets
     *
     * Reason we look at last 7 minutes is to account for any delay in processing.
     * Idempotency is relied on inngest based on tweet id.
     *
     * Learn more about syntax here: https://github.com/igorbrigadir/twitter-advanced-search
     *
     * I tag bot a lot in updates and most of these are useless interactions for him to process so ignoring as much.
     */
    const searchQuery = `@${TWITTER_USERNAME} -from:${TWITTER_USERNAME} -from:singh_saihaj within_time:7m`;
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
        throw new Error(result.error.message);
      }

      tweets = tweets.concat(result.data.tweets);
      cursor = result.data.next_cursor || '';
      API.searchParams.set('cursor', cursor);

      // If there are no more tweets to fetch, break out of the loop
      if (!result.data.has_next_page) {
        break;
      }
    } while (cursor);

    log.info({ size: tweets.length }, 'fetched tweets');
    /**
     * There is a limit of 512KB for batching events. To avoid hitting this limit, we chunk the tweets
     * https://www.inngest.com/docs/events#sending-multiple-events-at-once
     */
    const chunkTweets = chunk(tweets, 5);

    chunkTweets.forEach(async chunk => {
      const inngestSent = await inngest.send(
        chunk.map(tweet => ({
          name: 'tweet.process',
          data: tweet,
          id: tweet.id,
        })),
      );

      log.info({ size: inngestSent.ids.length }, 'sent to inngest');
    });

    return {
      message: `Sent ${tweets.length} tweets to inngest`,
    };
  },
);
