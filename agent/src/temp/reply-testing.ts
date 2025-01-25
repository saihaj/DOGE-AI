import Handlebars from 'handlebars';
import { createXai } from '@ai-sdk/xai';
import dotenv from 'dotenv';
import { CoreMessage, generateText, streamText } from 'ai';
import { writeFile } from 'node:fs/promises';
import { bill, billVector, db, like, sql, inArray } from 'database';
import * as readline from 'node:readline/promises';
import {
  QUESTION_EXTRACTOR_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
  TWITTER_REPLY_TEMPLATE,
} from '../twitter/prompts';
import { generateEmbedding, getTweet } from '../twitter/helpers';
import { REJECTION_REASON } from '../const';
import { openai } from '@ai-sdk/openai';
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

/**
 * given a tweet id, we try to follow the thread get more context about the tweet
 */
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

/**
 * Given some text try to narrow down the bill to focus on.
 *
 * If you get a bill title.
 * then we can filter the embeddings to that title
 * and then try to search for user question for embeddings
 *
 * If you do not get a bill title
 * we are out of luck and we just use the user question to search all the embeddings
 */
async function getBillContext({
  text,
  question,
}: {
  text: string;
  question: string;
}) {
  const billTitleResult = await generateText({
    model: openai('gpt-4o'),
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `You are an AI specialized in analyzing tweets related to U.S. Congressional bills. Given a tweet, extract the official title of the bill mentioned. If multiple bills are referenced, list all their titles. If no bill is mentioned, respond with 'NO_TITLE_FOUND.' Return only the title(s) without additional commentary.`,
      },
      {
        role: 'user',
        content: text,
      },
    ],
  });

  const questionEmbedding = await generateEmbedding(question);
  const embeddingArrayString = JSON.stringify(questionEmbedding);

  const billTitle = billTitleResult.text;

  if (billTitle.startsWith('NO_TITLE_FOUND')) {
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

    return vectorSearch.map(row => row.text).join('\n---\n');
  }

  const billSearch = await db
    .select({ id: bill.id })
    .from(bill)
    .where(like(bill.title, billTitle))
    .limit(5);

  const vectorSearch = await db
    .select({
      text: billVector.text,
      bill: billVector.bill,
      distance: sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString}))`,
    })
    .from(billVector)
    .where(
      inArray(
        billVector.bill,
        billSearch.map(row => row.id),
      ),
    )
    .orderBy(
      // ascending order
      sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString})) ASC`,
    )
    .limit(10);

  return vectorSearch.map(row => row.text).join('\n---\n');
}

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

  const relevantContext = await getBillContext({
    text: threadContext,
    question: questionResult.text,
  });
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
    `dev-test/${tweetId}.txt`,
    messages.map(m => `"${m.role}": ${m.content}\n\n`).join('\n') +
      `"assistant": ${fullResponse}\n`,
  );
}

main().catch(console.error);
