import { chunk } from 'lodash-es';
import { z } from 'zod';
import { reportFailureToDiscord } from '../discord/action';
import { inngest } from '../inngest';
import { logger } from '../logger';
import { tweetsIngested } from '../prom';
import { fetchTweetsFromList } from './ingest-interaction';

const ID = 'ingest-cdnyc-inter-tweets';
const log = logger.child({ module: ID });

const WINDOW = 6;

export const ingestCdnycInteractionTweets = inngest.createFunction(
  {
    id: ID,
    onFailure: async ({ error }) => {
      const errorMessage = error.message;
      log.error({ error: errorMessage }, 'Failed to ingest interaction tweets');
      await reportFailureToDiscord({
        message: `[ingest-cdnyc-inter-tweets]: ${errorMessage}`,
      });
    },
  },
  // Runs every 5 minutes between 8am and midnight
  { cron: 'TZ=America/New_York */5 8-23 * * *' },
  async () => {
    const [list] = await Promise.all([
      // https://x.com/i/lists/1942682760713298237
      fetchTweetsFromList({
        window: WINDOW,
        id: '1942682760713298237',
      }),
    ]);

    const totalTweets = list.tweets;

    const tweets = totalTweets
      // make sure to filter out any replies - for now
      // even though we set `includeReplies` to false in the API call above it still returns replies sometimes.
      .filter(t => t.isReply === false);

    log.info({ size: tweets.length }, `fetched ${tweets.length} tweets`);
    tweets.forEach(tweet => {
      log.info({ tweetId: tweet.id }, 'fetched tweet');
    });

    /**
     * There is a limit of 512KB for batching events. To avoid hitting this limit, we chunk the tweets
     * https://www.inngest.com/docs/events#sending-multiple-events-at-once
     */
    const chunkTweets = chunk(tweets, 5);
    log.info(
      {},
      `Chunked ${tweets.length} tweets into ${chunkTweets.length} chunks`,
    );

    chunkTweets.forEach(async chunk => {
      const inngestSent = await inngest.send(
        chunk.map(tweet => ({
          name: 'tweet.process.cdnyc-interaction',
          data: tweet,
          id: tweet.id,
        })),
      );

      log.info({ size: inngestSent.ids.length }, 'sent to inngest');
    });

    tweetsIngested.inc(
      {
        method: ID,
      },
      tweets.length,
    );

    return {
      message: `Scraped: ${totalTweets.length}. Sent ${tweets.length} tweets to inngest. Since time: ${list.sinceTime}, Until time: ${list.untilTime}`,
    };
  },
);
