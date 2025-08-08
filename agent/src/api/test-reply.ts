import { Static, Type } from '@sinclair/typebox';
import { CoreMessage } from 'ai';
import Handlebars from 'handlebars';
import { OPENAI_API_KEY, REJECTION_REASON } from '../const';
import { getPromptContent } from '../controlplane-api/prompt-registry';
import { logger } from '../logger';
import {
  generateReply,
  getReplyTweetQuestionPrompt,
  getTweetContext,
} from '../twitter/execute';
import { getShortResponse } from '../twitter/execute-interaction';
import { questionExtractor } from '../twitter/helpers';
import { getKbContext } from '../twitter/knowledge-base';

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

  const extractedQuestion =
    tweetWeRespondingTo.role === 'user'
      ? await questionExtractor({
          role: 'user',
          content: tweetWeRespondingTo.content,
        })
      : '';

  if (extractedQuestion.startsWith(REJECTION_REASON.NO_QUESTION_DETECTED)) {
    throw new Error(REJECTION_REASON.NO_QUESTION_DETECTED);
  }

  const kb = await getKbContext(
    {
      messages: [...tweetThread, tweetWeRespondingTo],
      text: extractedQuestion,
      billEntries: true,
      documentEntries: true,
      manualEntries: false,
      openaiApiKey: OPENAI_API_KEY,
    },
    log,
  );

  if (kb?.bill) {
    log.info(
      {
        id: kb.bill.id,
        title: kb.bill.title,
      },
      'bill found',
    );
  }
  const messages: Array<CoreMessage> = [];

  if (kb?.documents) {
    messages.push({
      role: 'user',
      content: `Documents Context: ${kb.documents}\n\n`,
    });
  }

  const summary = kb?.bill ? `${kb.bill.title}: \n\n${kb.bill.content}` : '';
  if (summary) {
    messages.push({
      role: 'user',
      content: `Bills Context: ${summary}\n\n`,
    });
  }

  const fullContext = tweetThread.map(({ content }) => content).join('\n\n');
  const previousTweet =
    tweetThread?.[tweetThread.length - 1]?.content.toString() || '';
  const content = await getReplyTweetQuestionPrompt({
    question: extractedQuestion,
    lastDogeReply: previousTweet,
    fullContext,
  });

  messages.push({
    role: 'user',
    content,
  });
  messages.push({
    role: 'user',
    content: `now answer this question: "${extractedQuestion}"`,
  });

  log.info(messages, 'context given');

  const systemPrompt = mainPrompt
    ? mainPrompt
    : await getPromptContent({
        key: 'REPLY_TEMPLATE',
        orgId: '43e671ed-a66c-4c40-b461-6d5c18f0effb',
      });

  const {
    text: responseLong,
    metadata,
    formatted,
  } = await generateReply(
    { messages, systemPrompt },
    {
      log,
      method: 'processTestReplyRequest',
      action: 'api',
    },
  );

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
    answer: formatted,
    short: refinedOutput,
    bill: summary,
    metadata,
  };
}
