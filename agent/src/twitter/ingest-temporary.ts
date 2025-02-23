import { inngest } from '../inngest';
import { chunk } from 'lodash-es';
import { reportFailureToDiscord } from '../discord/action';
import { logger } from '../logger';
import { fetchTweetsFromList } from './ingest-interaction';

const log = logger.child({ module: 'ingest-temporary-interaction-tweets' });

const WINDOW = 6;

export const ingestTemporaryInteractionTweets = inngest.createFunction(
  {
    id: 'ingest-temporary-interaction-tweets',
    onFailure: async ({ error }) => {
      const errorMessage = error.message;
      log.error({ error: errorMessage }, 'Failed to ingest interaction tweets');
      await reportFailureToDiscord({
        message: `[ingest-interaction-tweets]: ${errorMessage}`,
      });
    },
  },
  // Runs every 5 minutes between midnight and 8am
  { cron: 'TZ=America/New_York */5 0-8 * * *' },
  async () => {
    const [dogeAiEngager] = await Promise.all([
      // https://x.com/i/lists/1893502820826984485
      fetchTweetsFromList({
        window: WINDOW,
        id: '1893502820826984485',
      }),
    ]);

    const totalTweets = dogeAiEngager.tweets;

    const tweets = totalTweets
      // make sure to filter out any replies - for now
      // even though we set `includeReplies` to false in the API call above it still returns replies sometimes.
      .filter(t => t.isReply === false);

    log.info({ size: tweets.length }, 'fetched tweets');

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
          name: 'tweet.process.interaction',
          data: tweet,
          id: tweet.id,
        })),
      );

      log.info({ size: inngestSent.ids.length }, 'sent to inngest');
    });

    return {
      message: `Scraped: ${totalTweets.length}. Sent ${tweets.length} tweets to inngest. Since time: ${dogeAiEngager.sinceTime}, Until time: ${dogeAiEngager.untilTime}`,
    };
  },
);
