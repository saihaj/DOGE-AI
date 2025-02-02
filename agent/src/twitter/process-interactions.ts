import { inngest } from '../inngest.ts';
import { NonRetriableError } from 'inngest';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { rejectedTweet, reportFailureToDiscord } from '../discord/action.ts';
import { PROMPTS } from './prompts.ts';

export const processInteractionTweets = inngest.createFunction(
  {
    id: 'process-interaction-tweets',
    onFailure: async ({ event, error }) => {
      const id = event?.data?.event?.data?.id;
      const url = event?.data?.event?.data?.url;

      if (!id || !url) {
        console.error('Failed to extract tweet ID or URL from event data');
        await reportFailureToDiscord({
          message: `[process-interaction-tweets]: unable to extract tweet ID or URL from event data. Run id: ${event.data.run_id}`,
        });
        return;
      }

      await rejectedTweet({
        tweetId: id,
        tweetUrl: url,
        reason: error.message,
      });
    },
    throttle: {
      limit: 10,
      period: '1m',
    },
  },
  { event: 'tweet.process.interaction' },
  async ({ event, step }) => {
    const shouldEngage = await step.run('should-engage', async () => {
      const systemPrompt =
        await PROMPTS.INTERACTION_ENGAGEMENT_DECISION_PROMPT();
      const result = await generateText({
        model: openai('gpt-4o'),
        temperature: 0,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Now give me a determination for this tweet: ${event.data.text}`,
          },
        ],
      });

      const decision = result.text.toLowerCase().trim().replace('.', ' ');

      return decision === 'engage' ? true : result.text;
    });

    if (shouldEngage === true) {
      await step.sendEvent('fire-off-tweet', {
        name: 'tweet.execute.interaction',
        data: {
          tweetId: event.data.id,
          action: 'reply',
          tweetUrl: event.data.url,
        },
      });
      return;
    }

    if (typeof shouldEngage === 'string') {
      throw new NonRetriableError(shouldEngage);
    }
  },
);
