import dotenv from 'dotenv';
import { CoreMessage, generateText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { and, bill as billDbSchema, db, eq } from 'database';
import Handlebars from 'handlebars';
import { writeFile } from 'node:fs/promises';
import {
  ANALYZE_PROMPT,
  ANSWER_SYSTEM_PROMPT,
  TWEET_SYSTEM_PROMPT,
  TWEET_USER_PROMPT,
} from './reason-prompts';
import {
  getReasonBillContext,
  getTweetContext,
  getTweetMessages,
} from '../twitter/execute';
import * as readline from 'node:readline/promises';
import { getTweet } from '../twitter/helpers';
import { QUESTION_EXTRACTOR_SYSTEM_PROMPT } from '../twitter/prompts';
import { REJECTION_REASON } from '../const';

dotenv.config();

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
});

async function getAnswer(
  bill: string,
  user: string,
  threadMessages: CoreMessage[],
) {
  const messages: CoreMessage[] = [];

  messages.push({
    // @ts-ignore
    role: 'user',
    content: ANSWER_SYSTEM_PROMPT,
  });

  messages.push(...threadMessages);

  messages.push({
    role: 'user',
    content: `Context from database: ${bill} \n\n Question: ${user}`,
  });
  const result = await generateText({
    // @ts-ignore
    // Temperature is not supported for o1-mini
    model: openai('o1-mini'),
    messages,
  });

  console.log(result);

  return result.text;
}

async function getBillSummary(bill: typeof billDbSchema.$inferSelect | null) {
  const messages: CoreMessage[] = [];

  const template = Handlebars.compile(ANALYZE_PROMPT);
  const prompt = template({
    billType: bill?.type,
    billNumber: bill?.number,
    billCongress: bill?.congress,
    billOriginChamber: bill?.originChamber,
    billTitle: bill?.title,
    content: bill?.content,
    impact: bill?.impact,
    funding: bill?.funding,
    spending: bill?.spending,
  });

  messages.push({
    role: 'user',
    content: prompt,
  });

  const result = await generateText({
    // @ts-ignore
    // Temperature is not supported for o1-mini
    model: openai('o1-mini'),
    messages,
  });

  return result.text;
}

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  const tweetUrl = await terminal.question('Enter the tweet URL: ');
  const tweetId = tweetUrl.split('/').pop();
  if (!tweetId) {
    throw new Error('No tweet ID found');
  }

  const tweetToActionOn = await getTweet({
    id: tweetId,
  });

  const text = tweetToActionOn.text;

  let threadMessages = tweetToActionOn.inReplyToId
    ? await getTweetMessages({
        id: tweetToActionOn.inReplyToId,
      })
    : tweetToActionOn.text;

  if (typeof threadMessages === 'string') {
    threadMessages = [
      {
        role: 'user',
        content: threadMessages,
      },
    ];
  }

  const questionResult = await generateText({
    model: openai('gpt-4o'),
    temperature: 0,
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

  let extractedText = questionResult.text;
  if (extractedText.startsWith('NO_QUESTION_DETECTED')) {
    extractedText = text;
  }

  const user = extractedText;

  const bill = await getReasonBillContext({
    messages: threadMessages,
  });

  const summary = await getBillSummary(bill);
  console.log('Summary Context: ', summary);

  const answer = await getAnswer(summary, user, threadMessages);

  const answerWithQuestion = `User: ${user}\nDogeAI: ${answer}`;
  await writeFile(`dev-test/answer.txt`, answerWithQuestion);

  console.log(answerWithQuestion);
}

main().catch(console.error);
