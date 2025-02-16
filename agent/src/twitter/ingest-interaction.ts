import { TWITTER_API_BASE_URL, TWITTER_API_KEY } from '../const';
import { inngest } from '../inngest';
import { z } from 'zod';
import { chunk } from 'lodash-es';
import { reportFailureToDiscord } from '../discord/action';
import { ListResultResponseSchema } from './helpers';
import { getUnixTime, subMinutes } from 'date-fns';
import { logger } from '../logger';

const API = new URL(TWITTER_API_BASE_URL);
API.pathname = '/twitter/list/tweets';

const log = logger.child({ module: 'ingest-interaction-tweets' });

async function fetchTweetsFromList({
  id,
  window,
}: {
  id: string;
  window: number;
}) {
  const current = new Date();
  API.searchParams.set('listId', id);
  API.searchParams.set('includeReplies', 'false');
  const sinceTime = getUnixTime(subMinutes(current, window)).toString();
  API.searchParams.set('sinceTime', sinceTime);
  const untilTime = getUnixTime(current).toString();
  API.searchParams.set('untilTime', untilTime);

  let tweets: z.infer<typeof ListResultResponseSchema>['tweets'] = [];
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

    const result = await ListResultResponseSchema.safeParseAsync(data);

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

  return {
    tweets,
    sinceTime,
    untilTime,
  };
}

const WINDOW = 6;

export const ingestInteractionTweets = inngest.createFunction(
  {
    id: 'ingest-interaction-tweets',
    onFailure: async ({ error }) => {
      const errorMessage = error.message;
      log.error({ error: errorMessage }, 'Failed to ingest interaction tweets');
      await reportFailureToDiscord({
        message: `[ingest-interaction-tweets]: ${errorMessage}`,
      });
    },
  },
  // Runs every 5 minutes between 8am and midnight
  { cron: 'TZ=America/New_York */5 8-23 * * *' },
  async () => {
    const [congress119Senators, dogeAiEngager, houseMembers] =
      await Promise.all([
        // https://x.com/i/lists/1882132360512061660
        fetchTweetsFromList({
          window: WINDOW,
          id: '1882132360512061660',
        }),
        // https://x.com/i/lists/1883919897194815632
        fetchTweetsFromList({
          window: WINDOW,
          id: '1883919897194815632',
        }),
        // https://x.com/i/lists/225745413
        fetchTweetsFromList({
          window: WINDOW,
          id: '225745413',
        }),
      ]);

    const totalTweets = congress119Senators.tweets.concat(
      dogeAiEngager.tweets,
      houseMembers.tweets,
    );

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
      message: `Scraped: ${totalTweets.length}. Sent ${tweets.length} tweets to inngest. Since time: ${congress119Senators.sinceTime}, Until time: ${congress119Senators.untilTime}`,
    };
  },
);
