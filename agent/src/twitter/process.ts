import { REJECTION_REASON, TWITTER_USERNAME } from '../const';
import { inngest } from '../inngest';
import { NonRetriableError } from 'inngest';
import { getTweet } from './helpers.ts';

/**
 * Fetches tweets from the Twitter API and queues them for processing.
 */
export const processTweets = inngest.createFunction(
  {
    id: 'process-tweets',
    onFailure: ({ error }) => {
      // TODO: send to discord
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
