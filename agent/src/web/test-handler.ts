import {
  getLongResponse,
  getReasonBillContext,
  getShortResponse,
} from '../twitter/execute-interaction';
import { getTweetContentAsText } from '../twitter/helpers';

export async function processTestRequest(
  tweetUrl: string,
  mainPrompt: string,
  refinePrompt: string,
): Promise<{ answer: string; short: string }> {
  const tweetId = tweetUrl.split('/').pop();
  if (!tweetId) {
    throw new Error('No tweet ID found in the provided URL.');
  }

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
  return { answer: responseLong, short: refinedOutput };
}
