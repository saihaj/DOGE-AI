import { CoreMessage, generateText } from 'ai';
import { getTweetContext } from '../twitter/execute';
import {
  getReasonBillContext,
  getShortResponse,
} from '../twitter/execute-interaction';
import { Static, Type } from '@sinclair/typebox';
import { PROMPTS, QUESTION_EXTRACTOR_SYSTEM_PROMPT } from '../twitter/prompts';
import { openai } from '@ai-sdk/openai';
import { REJECTION_REASON } from '../const';

export const ProcessTestReplyRequestInput = Type.Object({
  tweetId: Type.String(),
  mainPrompt: Type.Optional(Type.String()),
  refinePrompt: Type.Optional(Type.String()),
});
export type ProcessTestReplyRequestInput = Static<
  typeof ProcessTestReplyRequestInput
>;

export async function processTestReplyRequest({
  tweetId,
  mainPrompt,
  refinePrompt,
}: ProcessTestReplyRequestInput): Promise<{
  answer: string;
  short: string;
  bill: string;
  metadata: string | null;
}> {
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
  console.log(summary ? `\nBill found: ${summary}\n` : '\nNo bill found.\n');
  const messages: Array<CoreMessage> = [...tweetThread];

  if (summary) {
    messages.push({
      role: 'user',
      content: `Context from database: ${summary}\n\n`,
    });
  }

  messages.push({
    role: 'user',
    content: PROMPTS.REPLY_TWEET_QUESTION_PROMPT({
      question: extractedQuestion,
    }),
  });

  console.log('Context Given: ', JSON.stringify(messages, null, 2), '\n\n');

  const systemPrompt = mainPrompt
    ? mainPrompt
    : await PROMPTS.TWITTER_REPLY_TEMPLATE();
  const { text: responseLong } = await generateText({
    temperature: 0,
    model: openai('gpt-4o'),
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages,
    ],
  });
  console.log('\n\nLong: ', responseLong, '\n\n');

  const refinedOutput = await getShortResponse({
    topic: responseLong,
    refinePrompt,
  });

  return {
    answer: responseLong,
    short: refinedOutput,
    bill: summary,
    metadata: null,
  };
}
