import { CoreMessage, generateText } from 'ai';
import { getTweetContext } from '../twitter/execute';
import {
  getReasonBillContext,
  getShortResponse,
} from '../twitter/execute-interaction';
import { Static, Type } from '@sinclair/typebox';
import { PROMPTS, QUESTION_EXTRACTOR_SYSTEM_PROMPT } from '../twitter/prompts';
import { openai } from '@ai-sdk/openai';
import Handlebars from 'handlebars';
import { REJECTION_REASON } from '../const';
import { logger } from '../logger';

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
  const log = logger.child({ module: 'processTestReplyRequest', tweetId });
  const tweetThread = await getTweetContext({ id: tweetId }, log);
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

  const bill = await getReasonBillContext(
    {
      messages: tweetThread,
    },
    log,
  ).catch(_ => {
    return null;
  });
  const summary = bill ? `${bill.title}: \n\n${bill.content}` : '';
  if (bill) {
    log.info(bill, 'found bill');
  }
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

  log.info(messages, 'context given');

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

  if (refinePrompt) {
    refinePrompt = Handlebars.compile(refinePrompt)({
      topic: responseLong,
    });
  }

  const refinedOutput = await getShortResponse({
    topic: responseLong,
    refinePrompt,
  });

  log.info({
    long: responseLong,
    short: refinedOutput,
  });
  return {
    answer: responseLong,
    short: refinedOutput,
    bill: summary,
    metadata: null,
  };
}
