import {
  getLongResponse,
  getReasonBillContext,
  getShortResponse,
} from '../twitter/execute-interaction';
import { getTweetContentAsText } from '../twitter/helpers';
import { Static, Type } from '@sinclair/typebox';

export const ProcessTestEngageRequestInput = Type.Object({
  tweetId: Type.String(),
  mainPrompt: Type.Optional(Type.String()),
  refinePrompt: Type.Optional(Type.String()),
});
export type ProcessTestEngageRequestInput = Static<
  typeof ProcessTestEngageRequestInput
>;

export async function processTestEngageRequest({
  tweetId,
  mainPrompt,
  refinePrompt,
}: ProcessTestEngageRequestInput): Promise<{
  answer: string;
  short: string;
  bill: string;
}> {
  const content = await getTweetContentAsText({ id: tweetId });

  const bill = await getReasonBillContext({
    messages: [
      {
        role: 'user',
        content,
      },
    ],
  }).catch(_ => {
    return null;
  });

  const summary = bill ? `${bill.title}: \n\n${bill.content}` : '';
  console.log(summary ? `\n\nBill found: ${summary}\n\n` : 'No bill found.');

  const { responseLong, metadata } = await getLongResponse({
    summary,
    text: content,
    systemPrompt: mainPrompt,
  });

  if (metadata) {
    console.log('\n\nMetadata: ', metadata, '\n\n');
  }

  console.log('\n\nLong Response: ', responseLong, '\n\n');

  const refinedOutput = await getShortResponse({
    topic: responseLong,
    refinePrompt,
  });

  console.log('\n\nShort Response: ', refinedOutput, '\n\n');
  return {
    answer: responseLong,
    short: refinedOutput,
    bill: summary,
  };
}
