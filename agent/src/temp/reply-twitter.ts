import { writeFile } from 'node:fs/promises';
import * as readline from 'node:readline/promises';
import { getTweet, getTweetContentAsText } from '../twitter/helpers';
import {
  getLongResponse,
  getReasonBillContext,
  getShortResponse,
} from '../twitter/execute-interaction';
import { CoreMessage, generateText } from 'ai';
import { REJECTION_REASON, TWITTER_USERNAME } from '../const';
import { openai } from '@ai-sdk/openai';
import { QUESTION_EXTRACTOR_SYSTEM_PROMPT } from '../twitter/prompts';

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

    const messages: Array<CoreMessage> = [
      {
        role: 'system',
        content: `You are given context of a twitter thread. Analyze the context and then generate a response to user's question.`,
      },
      ...tweetThread,
      {
        role: 'user',
        content: `Can you answer this question in context of this conversation: ${extractedQuestion}`,
      },
    ];

    console.log(JSON.stringify(tweetThread, null, 2));
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main().catch(console.error);
