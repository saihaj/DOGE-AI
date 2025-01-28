import dotenv from 'dotenv';
import { CoreMessage, generateText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { and, bill as billDbSchema, db, eq } from 'database';
import Handlebars from 'handlebars';
import { writeFile } from 'node:fs/promises';
import * as readline from 'node:readline/promises';
import { QUESTION_EXTRACTOR_SYSTEM_PROMPT } from '../twitter/prompts';
import {
  ANALYZE_PROMPT,
  ANSWER_SYSTEM_PROMPT,
  AUTONOMOUS_ANSWER_SYSTEM_PROMPT,
  TWEET_SYSTEM_PROMPT,
  TWEET_USER_PROMPT,
} from './reason-prompts';
import {
  getReasonBillContext,
  getTweetContext,
  getTweetMessages,
} from '../twitter/execute';
import { getTweet } from '../twitter/helpers';

dotenv.config();

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY ?? '',
});

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});

async function getAnswer(
  user: string,
  threadMessages: CoreMessage[],
  autonomous: boolean = false,
  bill?: string,
): Promise<string> {
  if (!bill) {
    console.log('No bill found. Proceeding in autonomous mode...');
    autonomous = true;
  }

  const messages: CoreMessage[] = [
    {
      role: 'system',
      content: autonomous
        ? AUTONOMOUS_ANSWER_SYSTEM_PROMPT
        : ANSWER_SYSTEM_PROMPT,
    },
    ...(autonomous ? threadMessages.slice(0, -1) : threadMessages),
    {
      role: 'user',
      content: bill
        ? `Context from database: ${bill}\n\n Question: ${user}`
        : `${user}`,
    },
  ];

  await writeFile(`dev-test/messages.txt`, JSON.stringify(messages));

  const result = await generateText({
    // o1-mini does not support temperature
    // @ts-ignore
    temperature: 0,
    model: openai('gpt-4o'),
    messages,
  });

  return result.text;
}

// async function getBillSummary(
//   bill: typeof billDbSchema.$inferSelect | null,
// ): Promise<string> {
//   if (!bill) return '';

//   const template = Handlebars.compile(ANALYZE_PROMPT);
//   const prompt = template({
//     billType: bill.type,
//     billNumber: bill.number,
//     billCongress: bill.congress,
//     billOriginChamber: bill.originChamber,
//     billTitle: bill.title,
//     content: bill.content,
//     impact: bill.impact,
//     funding: bill.funding,
//     spending: bill.spending,
//   });

//   const messages: CoreMessage[] = [
//     {
//       role: 'user',
//       content: prompt,
//     },
//   ];

//   const result = await generateText({
//     // o1-mini does not support temperature
//     // @ts-ignore
//     model: openai('o1-mini'),
//     messages,
//   });

//   return result.text;
// }

// async function extractQuestion(text: string): Promise<string> {
//   const questionResult = await generateText({
//     model: openai('gpt-4o'),
//     temperature: 0,
//     messages: [
//       {
//         role: 'system',
//         content: QUESTION_EXTRACTOR_SYSTEM_PROMPT,
//       },
//       {
//         role: 'user',
//         content: text,
//       },
//     ],
//   });

//   let extractedText = questionResult.text.trim();
//   if (extractedText.startsWith('NO_QUESTION_DETECTED')) {
//     // If no question was detected, just return the original text
//     console.log('No question detected.');
//     extractedText = text;
//   }

//   return extractedText;
// }

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
    const text = `@${tweetToActionOn.author.userName}: ${tweetToActionOn.text}`;

    let autonomous = false;
    let threadMessages: CoreMessage[] | string = tweetToActionOn.text;
    if (tweetToActionOn.inReplyToId) {
      threadMessages = await getTweetMessages({
        id: tweetToActionOn.inReplyToId,
      });
    }

    // if threadMessages is a string, it means we only have text
    // we are in "autonomous" mode
    if (typeof threadMessages === 'string') {
      threadMessages = [
        {
          role: 'user',
          content: threadMessages,
        },
      ];
      autonomous = true;
    }

    // const userQuestion = await extractQuestion(text);
    const userQuestion = text;

    // Extract the bill object from the thread. TODO: accept an array of bills.
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
      // summary = await getBillSummary(bill);
      // console.log('Summary Context:\n', summary, '\n');
      summary = bill.title + ': \n\n' + bill.content;
      console.log('Summary Context:\n', summary, '\n');
    }

    const finalAnswer = await getAnswer(
      userQuestion,
      threadMessages,
      autonomous,
      summary,
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
