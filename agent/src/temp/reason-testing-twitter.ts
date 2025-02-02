import {
  CoreMessage,
  generateText,
  ImagePart,
  TextPart,
  UserContent,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { bill as billDbSchema } from 'database';
import { writeFile } from 'node:fs/promises';
import * as readline from 'node:readline/promises';
import { PROMPTS } from '../twitter/prompts';
import { getTweet } from '../twitter/helpers';
import { perplexity } from '@ai-sdk/perplexity';
import {
  getReasonBillContext,
  getTweetMessages,
} from '../twitter/execute-interaction';
function mergeConsecutiveSameRole(messages: CoreMessage[]): CoreMessage[] {
  if (messages.length === 0) {
    return [];
  }

  const merged: CoreMessage[] = [];

  for (const current of messages) {
    if (merged.length === 0) {
      merged.push(current);
    } else {
      const last = merged[merged.length - 1];

      if (last.role === current.role) {
        // Merge the string content
        last.content += '\n\n' + current.content;
      } else {
        merged.push(current);
      }
    }
  }

  return merged;
}

async function getAnswer(
  user: string,
  threadMessages: CoreMessage[],
  autonomous: boolean = false,
  bill?: string,
  mediaContent: ImagePart[] = [],
): Promise<string> {
  if (!bill) {
    console.log('No bill found. Proceeding in autonomous mode...');
    autonomous = true;
  }

  const systemPrompt = await PROMPTS.INTERACTION_SYSTEM_PROMPT();
  let messages: CoreMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    ...(autonomous ? threadMessages.slice(0, -1) : threadMessages),
    {
      role: 'user',
      content: bill
        ? `Context from database: ${bill}\n\n Question: ${user}`
        : `${user}`,
    },
  ];

  messages = mergeConsecutiveSameRole(messages);

  await writeFile(`dev-test/messages.txt`, JSON.stringify(messages));

  const result = await generateText({
    // o1-mini does not support temperature
    // @ts-ignore
    temperature: 0,
    // model: openai('gpt-4o', {
    //   downloadImages: true,
    // }),
    model: perplexity('sonar-reasoning'),
    messages,
  });

  console.log(result.experimental_providerMetadata);

  let firstLayer = result.text.replace(/<think>[\s\S]*?<\/think>/g, '');
  firstLayer = firstLayer.replace(/\[\d+\]/g, '');
  await writeFile(`dev-test/firstLayer.txt`, firstLayer);

  if (firstLayer.length <= 240) {
    return firstLayer;
  }

  console.log(
    `BEFORE REFINEMENT: ${result.text} \n\n-------------------------`,
  );

  const refinePrompt = await PROMPTS.INTERACTION_REFINE_OUTPUT_PROMPT();

  const finalAnswer = await generateText({
    model: openai('gpt-4o'),
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: `${refinePrompt} \n\n Response to modify: \n\n ${firstLayer}`,
      },
    ],
  });

  return finalAnswer.text;
}

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

    const tweetToActionOn = await getTweet({ id: tweetId });
    let content = `@${tweetToActionOn.author.userName}: ${tweetToActionOn.text}`;

    if (tweetToActionOn.quoted_tweet) {
      const quote = `@${tweetToActionOn.quoted_tweet.author.userName}: ${tweetToActionOn.quoted_tweet.text}`;
      content = `Quote: ${quote}\n\n${content}`;
    }

    const mediaContent: ImagePart[] = [];
    await writeFile(`dev-test/apitweet.txt`, JSON.stringify(tweetToActionOn));

    // TODO: not being used right now. Perplexity does not support images
    if (tweetToActionOn.extendedEntities?.media) {
      for (const media of tweetToActionOn.extendedEntities.media) {
        if (media?.type === 'photo') {
          console.log('MEDIA FOUND:', media);
          mediaContent.push({
            type: 'image',
            // @ts-ignore - TODO: fix this
            image: media.media_url_https,
          });
        }
      }
    }

    const text = content;

    let autonomous = false;
    let threadMessages: CoreMessage[] | string = tweetToActionOn.text;
    if (tweetToActionOn.inReplyToId) {
      threadMessages = await getTweetMessages({
        id: tweetToActionOn.inReplyToId,
      });
    }

    if (typeof threadMessages === 'string') {
      threadMessages = [
        {
          role: 'user',
          content: threadMessages,
        },
      ];
      autonomous = true;
    }

    const userQuestion = text;

    let bill: typeof billDbSchema.$inferSelect | null = null;
    let noContext = false;
    try {
      bill = await getReasonBillContext({ messages: threadMessages });
    } catch (err) {
      console.log(
        'Error retrieving bill context. Proceeding without context...',
        err,
      );
      noContext = true;
    }

    // Summarize the bill if we found one
    let summary = '';
    if (!noContext && bill) {
      // console.log('Summary Context:\n', summary, '\n');
      summary = bill.title + ': \n\n' + bill.content;
      console.log('Summary Context:\n', summary, '\n');
    }

    const finalAnswer = await getAnswer(
      userQuestion,
      threadMessages,
      autonomous,
      summary,
      mediaContent,
    );

    const answerWithQuestion = `User: ${userQuestion}\n\nDogeAI: ${finalAnswer}`;
    await writeFile(`dev-test/answer.txt`, answerWithQuestion);

    // Also print to console
    console.log('\n----- Final Answer -----');
    console.log(answerWithQuestion);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main().catch(console.error);
