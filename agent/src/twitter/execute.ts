import { DISCORD_SERVER_URL, REJECTION_REASON } from '../const';
import { inngest } from '../inngest';
import { NonRetriableError } from 'inngest';
import { getTweet } from './helpers.ts';
import { createXai } from '@ai-sdk/xai';
import { generateText } from 'ai';
import {
  QUESTION_EXTRACTOR_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
  TWITTER_REPLY_TEMPLATE,
} from './prompts.ts';

const xAi = createXai({});

// 1882584768866570575

/**
 * Fetches tweets from the Twitter API and queues them for processing.
 */
export const executeTweets = inngest.createFunction(
  {
    id: 'execute-tweets',
    onFailure: async ({ event, error }) => {
      const id = event?.data?.event?.data?.tweetId;
      const url = event?.data?.event?.data?.tweetUrl;

      if (!id || !url) {
        console.error('Failed to extract tweet ID or URL from event data');
        return;
      }

      try {
        await fetch(`${DISCORD_SERVER_URL}/rejected`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            url,
            reason: error.message,
          }),
        });
      } catch (err) {
        console.error('Failed to send rejection to Discord:', err);
      }

      console.log('Failed to process tweet:', error.message);
    },
  },
  { event: 'tweet.execute' },
  async ({ event, step }) => {
    switch (event.data.action) {
      case 'reply': {
        // TODO: make sure we are not replying to a tweet we already replied to

        const tweetToActionOn = await getTweet({
          id: event.data.tweetId,
        }).catch(e => {
          throw new NonRetriableError(e);
        });

        const mainTweet = await getTweet({
          id: tweetToActionOn.inReplyToId,
        }).catch(e => {
          throw new NonRetriableError(e);
        });

        const question = await step.run('extract-question', async () => {
          const text = mainTweet.text;
          const question = await generateText({
            model: xAi('grok-2-1212'),
            messages: [
              {
                role: 'system',
                content: QUESTION_EXTRACTOR_SYSTEM_PROMPT,
              },
              {
                role: 'user',
                content: text,
              },
            ],
          });

          if (question.text.startsWith('NO_QUESTION_DETECTED')) {
            throw new NonRetriableError(REJECTION_REASON.NO_QUESTION_DETECTED);
          }

          return question.text;
        });

        // TODO: improvement is connecting it with the KB store and provide more context

        const reply = await step.run('generate-reply', async () => {
          const response = await generateText({
            model: xAi('grok-2-1212'),
            messages: [
              {
                role: 'system',
                content: SYSTEM_PROMPT,
              },
              {
                role: 'user',
                content: mainTweet.text,
              },
              {
                role: 'user',
                content: TWITTER_REPLY_TEMPLATE,
              },
              {
                role: 'user',
                content: question,
              },
            ],
          });

          return response.text;
        });

        // send reply
        // embed and store reply
        break;
      }
      default: {
        throw new NonRetriableError(REJECTION_REASON.ACTION_NOT_SUPPORTED);
      }
    }
  },
);
