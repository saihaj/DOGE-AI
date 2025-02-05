import { writeFile } from 'node:fs/promises';
import * as readline from 'node:readline/promises';
import { getTweet, getTweetContentAsText } from '../twitter/helpers';
import {
  getReasonBillContext,
  getShortResponse,
} from '../twitter/execute-interaction';
import { CoreMessage, generateText } from 'ai';
import { REJECTION_REASON, TWITTER_USERNAME } from '../const';
import { openai } from '@ai-sdk/openai';
import { QUESTION_EXTRACTOR_SYSTEM_PROMPT } from '../twitter/prompts';
import { PROMPT } from '../../dev-test/prompt';

/**
 * given a tweet id, we try to follow the full thread up to a certain limit.
 */
async function getTweetContext({
  id,
}: {
  id: string;
}): Promise<Array<CoreMessage>> {
  const LIMIT = 50;
  let tweets: Array<CoreMessage> = [];

  let searchId: null | string = id;
  do {
    const tweet = await getTweet({ id: searchId });

    if (tweet.inReplyToId) {
      searchId = tweet.inReplyToId;
    }

    if (tweet.inReplyToId === null) {
      searchId = null;
    }

    // Limit max tweets
    if (tweets.length > LIMIT) {
      searchId = null;
    }

    // extract tweet text
    const content = await getTweetContentAsText({ id: tweet.id });

    tweets.push({
      // Bot tweets are always assistant
      role: tweet.author.userName === TWITTER_USERNAME ? 'assistant' : 'user',
      content,
    });
  } while (searchId);

  return tweets.reverse();
}

/**
 * Next version of replies to tweets.
 *
 * This one is more context-aware, better at understanding the context of the tweet, better search results, and better at generating responses.
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
    console.log(summary ? `\n\nBill found: ${summary}\n\n` : 'No bill found.');
    const messages: Array<CoreMessage> = [...tweetThread];

    if (summary) {
      messages.push({
        role: 'user',
        content: `Context from database: ${summary}\n\n`,
      });
    }

    messages.push({
      role: 'user',
      content: `Please answer this question in context of this conversation: "${extractedQuestion}"
IMPORTANT:
Remember if a [Bill Title] is found to use specifics, including bill references ([Bill Title], Section [###]: [Section Name]), names, and attributions. Do not remove relevant policy context. If no [Bill Title] is found, do not generate or infer any bill names, legislative history, or policy details from OpenAI's training data; instead, answer the question directly based only on the provided context without referencing any bill. Deviating from these instructions by fabricating information or relying on unauthorized sources is extremely dangerous and must not happen under any circumstances.`,
    });

    console.log('Context Given: ', JSON.stringify(messages, null, 2), '\n\n');

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
