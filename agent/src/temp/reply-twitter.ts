import * as readline from 'node:readline/promises';
import {
  getReasonBillContext,
  getShortResponse,
} from '../twitter/execute-interaction';
import { CoreMessage, generateText } from 'ai';
import { REJECTION_REASON } from '../const';
import { openai } from '@ai-sdk/openai';
import { PROMPTS, QUESTION_EXTRACTOR_SYSTEM_PROMPT } from '../twitter/prompts';
import { getTweetContext } from '../twitter/execute';

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

    const tweetThread = await getTweetContext({ id: tweetId });
    const tweetWeRespondingTo = tweetThread.pop();

    if (!tweetWeRespondingTo) {
      throw new Error('No tweet found to respond to.');
    }

    const { text: extractedQuestion } = await generateText({
      model: openai('gpt-4o'),
      temperature: 0,
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

    const bill = await getReasonBillContext({
      messages: tweetThread,
    }).catch(_ => {
      return null;
    });
    const summary = bill ? `${bill.title}: \n\n${bill.content}` : '';
    console.log(summary ? `\nBill found: ${summary}\n` : '\nNo bill found.\n');
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

    console.log('Context Given: ', JSON.stringify(messages, null, 2), '\n\n');
    const PROMPT = await PROMPTS.TWITTER_REPLY_TEMPLATE();
    const { text } = await generateText({
      temperature: 0,
      model: openai('gpt-4o'),
      messages: [
        {
          role: 'system',
          content: PROMPT,
        },
        ...messages,
      ],
    });
    console.log('\n\nLong: ', text, '\n\n');

    const refinedOutput = await getShortResponse({ topic: text });
    console.log('\n\nShort: ', refinedOutput, '\n\n');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main().catch(console.error);
