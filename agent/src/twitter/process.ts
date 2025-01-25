import {
  TWITTER_USERNAME,
  REJECTION_REASON,
  DISCORD_SERVER_URL,
} from '../const';
import { inngest } from '../inngest';
import { NonRetriableError } from 'inngest';
import { getTweet } from './helpers.ts';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { ENGAGEMENT_DECISION_PROMPT } from './prompts.ts';

const openai = createOpenAI({
  compatibility: 'strict',
});

/**
 * Fetches tweets from the Twitter API and queues them for processing.
 */
export const processTweets = inngest.createFunction(
  {
    id: 'process-tweets',
    // onFailure: async ({ event, error }) => {
    //   const id = event?.data?.event?.data?.id;
    //   const url = event?.data?.event?.data?.url;

    //   if (!id || !url) {
    //     console.error('Failed to extract tweet ID or URL from event data');
    //     return;
    //   }

    //   try {
    //     await fetch(`${DISCORD_SERVER_URL}/rejected`, {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({
    //         id,
    //         url,
    //         reason: error.message,
    //       }),
    //     });
    //   } catch (err) {
    //     console.error('Failed to send rejection to Discord:', err);
    //   }

    //   console.log('Failed to process tweet:', error.message);
    // },
    throttle: {
      limit: 100,
      period: '1m',
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
        const shouldEngage = await step.run('should-engage', async () => {
          const result = await generateText({
            model: openai('gpt-4o'),
            temperature: 0,
            messages: [
              { role: 'system', content: ENGAGEMENT_DECISION_PROMPT },
              {
                role: 'assistant',
                content: mainTweet.text,
              },
              {
                role: 'user',
                content: `Now give me a determination for this tweet: ${event.data.text}`,
              },
            ],
          });

          const decision = result.text.toLowerCase().trim();
          return decision === 'engage';
        });

        if (!shouldEngage) {
          throw new NonRetriableError(
            REJECTION_REASON.SPAM_DETECTED_DO_NOT_ENGAGE,
          );
        }

        // now we can send to execution job
        await step.sendEvent('fire-off-tweet', {
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
