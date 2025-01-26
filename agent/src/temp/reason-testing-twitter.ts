import dotenv from 'dotenv';
import { CoreMessage, generateText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { and, bill as billDbSchema, db, eq } from 'database';
import Handlebars from 'handlebars';
import { writeFile } from 'node:fs/promises';
import { ANALYZE_PROMPT, ANSWER_SYSTEM_PROMPT, TWEET_SYSTEM_PROMPT, TWEET_USER_PROMPT } from './reason-prompts';
import { getReasonBillContext, getTweetContext } from '../twitter/execute';
import * as readline from 'node:readline/promises';
import { getTweet } from '../twitter/helpers';
import { QUESTION_EXTRACTOR_SYSTEM_PROMPT } from '../twitter/prompts';
import { REJECTION_REASON } from '../const';

dotenv.config();

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});

async function getAnswer(bill: string, user: string, threadContext: string) {
  const messages: CoreMessage[] = [];

  messages.push({
    role: 'system',
    content: ANSWER_SYSTEM_PROMPT,
  });

  messages.push({
    role: 'user',
    content: `Context from X: ${threadContext} \n\n Context from database: ${bill} \n\n Question: ${user}`,
  });
  const result = await generateText({
    // @ts-ignore
    model: deepseek('deepseek-reasoner'),
    messages,
    maxTokens: 100
  });

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
    model: deepseek('deepseek-reasoner'),
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

  const threadContext = tweetToActionOn.inReplyToId
    ? await getTweetContext({
        id: tweetToActionOn.inReplyToId,
      })
    : tweetToActionOn.text;

const originalBillPost = threadContext;

console.log(originalBillPost);

  const questionResult = await generateText({
    model: deepseek('deepseek-chat'),
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

  if (questionResult.text.startsWith('NO_QUESTION_DETECTED')) {
    throw new Error(REJECTION_REASON.NO_QUESTION_DETECTED);
  }

  
  const user = questionResult.text;

  const bill = await getReasonBillContext({question:originalBillPost, text: originalBillPost});

  const summary = await getBillSummary(bill);
  console.log('DOGEai: ', summary);

  const answer = await getAnswer(summary, user, threadContext);

  const answerWithQuestion = `User: ${user}\nDogeAI: ${answer}`;
  await writeFile(
    `dev-test/answer.txt`,
    answerWithQuestion,
  );
}

main().catch(console.error);
