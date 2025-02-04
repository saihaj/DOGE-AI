import Handlebars from 'handlebars';
import dotenv from 'dotenv';
import { CoreMessage, generateText, streamText } from 'ai';
import { writeFile } from 'node:fs/promises';
import * as readline from 'node:readline/promises';
import { PROMPTS, QUESTION_EXTRACTOR_SYSTEM_PROMPT } from '../twitter/prompts';
import { getTweet } from '../twitter/helpers';
import { REJECTION_REASON } from '../const';
import { openai } from '@ai-sdk/openai';
import { getBillContext, getTweetContext } from '../twitter/execute';
dotenv.config();

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

  const systemPrompt = await PROMPTS.SYSTEM_PROMPT();
  const botUserPrompt = await PROMPTS.TWITTER_REPLY_TEMPLATE();
  const messages: CoreMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: `Context from database: ${relevantContext}`,
    },
    {
      role: 'user',
      content: `If there is no matching bill or detailed information available from the knowledge base, but the original ${threadContext} provides relevant details, you may discuss the topic freely while adhering to strict guidelines: Avoid stating concrete facts or figures that cannot be verified from the knowledge base; instead, focus on general insights or implications tied to the topic. Acknowledge gaps in clarity by using phrases like “Details unclear” or “Specifics not provided” to maintain transparency. Provide thoughtful analysis and actionable commentary without speculating or assuming unsupported details. For example, if the ${threadContext} states, “Government overspent $3B on redundant infrastructure projects while delaying disaster funding,” and someone asks, “What infrastructure projects were these, and why were they redundant?” an appropriate response would be, "Details unclear, but redundancy often stems from overlapping projects without coordination. Better oversight and clear priorities could prevent waste."`,
    },
    {
      role: 'user',
      content: botUserPrompt,
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
