import { inngest } from '../inngest.ts';
import { NonRetriableError } from 'inngest';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { rejectedTweet, reportFailureToDiscord } from '../discord/action.ts';
import { PROMPTS, QUESTION_EXTRACTOR_SYSTEM_PROMPT } from './prompts.ts';
import { logger } from '../logger.ts';
import { REJECTION_REASON, SEED, TEMPERATURE } from '../const.ts';

export const processInteractionTweets = inngest.createFunction(
  {
    id: 'process-interaction-tweets',
    onFailure: async ({ event, error }) => {
      const id = event?.data?.event?.data?.id;
      const url = event?.data?.event?.data?.url;
      const log = logger.child({
        module: 'process-interaction-tweets',
        tweetId: id,
        eventId: event.data.event.id,
      });

      if (!id || !url) {
        log.error(
          {
            event: event.data.event,
          },
          'failed to extract tweet id or url from event data',
        );
        await reportFailureToDiscord({
          message: `[process-interaction-tweets]: unable to extract tweet ID or URL from event data. Run id: ${event.data.run_id}`,
        });
        return;
      }

      log.error(
        {
          reason: error.message,
        },
        'do no engage',
      );
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
    const log = logger.child({
      module: 'process-interaction-tweets',
      tweetId: event.data.id,
      eventId: event.id,
    });

    const tweetText = event.data.text;

    const shouldEngage = await step.run('should-engage', async () => {
      const systemPrompt =
        await PROMPTS.INTERACTION_ENGAGEMENT_DECISION_PROMPT();
      const result = await generateText({
        model: openai('gpt-4o'),
        temperature: TEMPERATURE,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Now give me a determination for this tweet: ${tweetText}`,
          },
        ],
      });

      const decision = result.text.toLowerCase().trim().replace('.', ' ');

      if (decision === 'ignore') {
        throw Error('Need reason to ignore the tweet');
      }

      return decision === 'engage' ? true : result.text;
    });

    if (shouldEngage === true) {
      // we only need to engage further if there's a question. So let's bail out early
      await step.run('extract-question', async () => {
        const { text: extractedQuestion } = await generateText({
          model: openai('gpt-4o'),
          temperature: TEMPERATURE,
          seed: SEED,
          messages: [
            {
              role: 'system',
              content: QUESTION_EXTRACTOR_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: tweetText,
            },
          ],
        });

        if (
          extractedQuestion.startsWith(REJECTION_REASON.NO_QUESTION_DETECTED)
        ) {
          log.error({}, 'no question found');
          throw new NonRetriableError(REJECTION_REASON.NO_QUESTION_DETECTED);
        }
      });

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
