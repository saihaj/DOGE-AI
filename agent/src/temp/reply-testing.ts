import Handlebars from 'handlebars';
import { createXai } from '@ai-sdk/xai';
import dotenv from 'dotenv';
import { CoreMessage, generateText, streamText, tool } from 'ai';
import { writeFile } from 'node:fs/promises';
import { bill, billVector, db, desc, gt, sql } from 'database';
import * as readline from 'node:readline/promises';
import {
  QUESTION_EXTRACTOR_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
  TWITTER_REPLY_TEMPLATE,
} from '../twitter/prompts';
import { generateEmbedding, getTweet } from '../twitter/helpers';
import { REJECTION_REASON } from '../const';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
dotenv.config();

const xAi = createXai({});

const TWITTER_POST_TEMPLATE = `### About {{agentName}} (@{{twitterUserName}}):
Mixed critiques government inefficiency, misplaced priorities, and systemic contradictions, offering sharp, engaging takes on policies that matter to everyday Americans.

### Post examples for {{agentName}}:
{{characterPostExamples}}

### Task: Write a tweet in the voice of {{agentName}} (@{{twitterUserName}}) about the {{billTitle}}

**Guidelines:**  
1. **Avoid naming the bill directly** in the opening. Focus on its implications, contradictions, or systemic issues.  
2. Use **provocative, conversational language** to engage readers and highlight misplaced priorities.  
3. Include **varied hooks** like surprising facts, moral challenges, or analogies.  
4. Keep tweets concise: **The total character count MUST be less than {{maxTweetLength}} (including the source link).**  
5. Append the source at the end of the post in this format: Source: {{billSourceUrl}}. 
6. Avoid questions, emojis, and technical jargon. Keep it simple and direct.  

### Example Outputs:  
{{outputExamples}}

Topic to discuss: {{billDetails}}
`;

const postTemplate = Handlebars.compile(TWITTER_POST_TEMPLATE);

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function getTweetContext({ id }: { id: string }) {
  let tweets: Awaited<ReturnType<typeof getTweet>>[] = [];

  let searchId: null | string = id;
  do {
    const tweet = await getTweet({ id: searchId });
    tweets.push(tweet);
    if (tweet.inReplyToId) {
      searchId = tweet.inReplyToId;
    }

    if (tweet.inReplyToId === null) {
      searchId = null;
    }

    // Limit to 5 tweets
    if (tweets.length > 5) {
      searchId = null;
    }
  } while (searchId);

  return tweets
    .reverse()
    .map(tweet => tweet.text)
    .join('\n---\n');
}

function getBillInfo({ text }: { text: string }) {}

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

  const threadContext = await getTweetContext({
    id: tweetToActionOn.inReplyToId!,
  });

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

  if (questionResult.text.startsWith('NO_QUESTION_DETECTED')) {
    throw new Error(REJECTION_REASON.NO_QUESTION_DETECTED);
  }

  const billTitle = await generateText({
    model: openai('gpt-4o'),
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `You are an AI specialized in analyzing tweets related to U.S. Congressional bills. Given a tweet, extract the official title of the bill mentioned. If multiple bills are referenced, list all their titles. If no bill is mentioned, respond with 'NO_TITLE_FOUND.' Return only the title(s) without additional commentary.`,
      },
      {
        role: 'user',
        content: threadContext,
      },
    ],
  });

  const embeddingQueryQuestion = (() => {
    if (billTitle.text.startsWith('NO_TITLE_FOUND')) {
      return questionResult.text;
    }
    return billTitle.text;
  })();
  console.log(billTitle.text);
  const questionEmbedding = await generateEmbedding(embeddingQueryQuestion);
  const embeddingArrayString = JSON.stringify(questionEmbedding);

  const vectorSearch = await db
    .select({
      text: billVector.text,
      bill: billVector.bill,
      distance: sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString}))`,
    })
    .from(billVector)
    .orderBy(
      // ascending order
      sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString})) ASC`,
    )
    .limit(10);

  const relevantContext = vectorSearch.map(row => row.text).join('\n---\n');

  const question = questionResult.text;

  const messages: CoreMessage[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `Context from X: ${threadContext}`,
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
    model: xAi('grok-2-1212'),
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
    `dev-test/${tweetId}.txt`,
    messages.map(m => `"${m.role}": ${m.content}\n\n`).join('\n') +
      `"assistant": ${fullResponse}\n`,
  );
}

main().catch(console.error);
