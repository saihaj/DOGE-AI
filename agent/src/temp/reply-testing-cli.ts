import dotenv from 'dotenv';
import { CoreMessage, generateText, streamText } from 'ai';
import { writeFile } from 'node:fs/promises';
import * as readline from 'node:readline/promises';
import { SYSTEM_PROMPT, TWITTER_REPLY_TEMPLATE } from '../twitter/prompts';
import { openai } from '@ai-sdk/openai';
import { getBillContext } from '../twitter/execute';
dotenv.config();

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  const question = await terminal.question('Enter your question: ');

  const relevantContext = await getBillContext({
    text: question,
    question: question,
  });

  const messages: CoreMessage[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `Question: ${question}`,
    },
    {
      role: 'user',
      content: `Context from database: ${relevantContext}`,
    },
    {
      role: 'user',
      content: TWITTER_REPLY_TEMPLATE,
    },
    {
      role: 'user',
      content: question,
    },
  ];

  const response = streamText({
    model: openai('gpt-4o'),
    temperature: 0,
    messages,
  });

  process.stdout.write('\DOGEai: ');
  let fullResponse = '';
  for await (const delta of response.textStream) {
    fullResponse += delta;
    process.stdout.write(delta);
  }
  process.stdout.write('\n\n');

  await writeFile(
    `dev-test/question.txt`,
    messages.map(m => `"${m.role}": ${m.content}\n\n`).join('\n') +
      `"assistant": ${fullResponse}\n`,
  );
}

main().catch(console.error);
