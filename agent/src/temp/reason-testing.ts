import dotenv from 'dotenv';
import { CoreMessage, generateText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { and, bill as billDbSchema, db, eq } from 'database';
import Handlebars from 'handlebars';
import { writeFile } from 'node:fs/promises';
import {
  ANALYZE_PROMPT,
  ANSWER_SYSTEM_PROMPT,
  TWEET_SYSTEM_PROMPT,
  TWEET_USER_PROMPT,
} from './reason-prompts';
import { getReasonBillContext } from '../twitter/execute';
dotenv.config();

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});

async function getAnswer(bill: string, user: string, tweet: string) {
  const messages: CoreMessage[] = [];

  messages.push({
    role: 'system',
    content: ANSWER_SYSTEM_PROMPT,
  });

  messages.push({
    role: 'user',
    content:
      'Bill: {{bill}}\n\n Create a tweet based on the summary, hand pick the most important information and make it concise and to the point.',
  });

  messages.push({
    role: 'assistant',
    content: tweet,
  });

  messages.push({
    role: 'user',
    content: user,
  });

  const result = await generateText({
    // @ts-ignore
    model: deepseek('deepseek-chat'),
    messages,
    maxTokens: 100,
  });

  return result.text;
}

async function getTweet(bill: string) {
  const messages: CoreMessage[] = [];

  const userTemplate = Handlebars.compile(TWEET_USER_PROMPT);
  const userPrompt = userTemplate({
    summary: bill,
  });

  messages.push({
    role: 'system',
    content: TWEET_SYSTEM_PROMPT,
  });

  messages.push({
    role: 'user',
    content: userPrompt,
  });

  const result = await generateText({
    // @ts-ignore
    model: deepseek('deepseek-reasoner'),
    messages,
    maxTokens: 100,
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

async function main() {
  const user =
    'How would you suggest people work together to block their Stop the Scroll Act?';

  const bill = await getReasonBillContext({ question: user, text: user });

  const summary = await getBillSummary(bill);
  console.log('DOGEai: ', summary);

  const tweet = await getTweet(summary);

  await writeFile(`dev-test/tweet.txt`, tweet);

  const answer = await getAnswer(summary, user, tweet);

  const answerWithQuestion = `User: ${user}\nDogeAI: ${answer}`;
  await writeFile(`dev-test/answer.txt`, answerWithQuestion);
}

main().catch(console.error);
