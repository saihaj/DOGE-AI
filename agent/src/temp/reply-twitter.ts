import * as readline from 'node:readline/promises';
import { getReasonBillContext } from '../twitter/execute-interaction';
import { CoreMessage, generateText } from 'ai';
import { REJECTION_REASON, SEED, TEMPERATURE } from '../const';
import { openai } from '@ai-sdk/openai';
import { PROMPTS, QUESTION_EXTRACTOR_SYSTEM_PROMPT } from '../twitter/prompts';
import { generateReply, getTweetContext } from '../twitter/execute';
import { logger } from '../logger';
import { mergeConsecutiveSameRole } from '../twitter/helpers';

const log = logger.child({ module: 'cli-reply-twitter' });

/**
 * Testing replies on a tweet where DOGEai gets pinged.
 */
async function main() {
  const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const tweetUrl = await terminal.question('Enter the tweet URL: ');
    terminal.close();

    const tweetId = tweetUrl.split('/').pop();
    if (!tweetId) {
      throw new Error('No tweet ID found in the provided URL.');
    }

    const tweetThread = await getTweetContext({ id: tweetId }, log);
    const tweetWeRespondingTo = tweetThread.pop();

    if (!tweetWeRespondingTo) {
      throw new Error('No tweet found to respond to.');
    }

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
          content:
            tweetWeRespondingTo.role === 'user'
              ? tweetWeRespondingTo.content
              : '',
        },
      ],
    });

    if (extractedQuestion.startsWith(REJECTION_REASON.NO_QUESTION_DETECTED)) {
      throw new Error(REJECTION_REASON.NO_QUESTION_DETECTED);
    }

    const bill = await getReasonBillContext(
      {
        messages: tweetThread,
      },
      log,
    ).catch(_ => {
      return null;
    });
    const summary = bill ? `${bill.title}: \n\n${bill.content}` : '';
    if (bill) {
      log.info(
        {
          billId: bill.id,
          billTitle: bill.title,
        },
        'found bill',
      );
    }
    const messages: Array<CoreMessage> = [...tweetThread];

    if (summary) {
      messages.push({
        role: 'user',
        content: `Context from database: ${summary}\n\n`,
      });
    }

    messages.push({
      role: 'user',
      content: PROMPTS.REPLY_TWEET_QUESTION_PROMPT({
        question: extractedQuestion,
      }),
    });

    const mergedMessages = mergeConsecutiveSameRole(messages);
    log.info(mergedMessages, 'context given');

    const { text } = await generateReply({ messages });

    console.log('\n\nResponse: ', text, '\n\n');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main().catch(console.error);
