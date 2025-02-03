import { getAnswer } from '../temp/reason-testing-twitter';

import {
  getReasonBillContext,
  getTweetMessages,
} from '../twitter/execute-interaction';
import { getTweet } from '../twitter/helpers';
import { bill as billDbSchema } from 'database';

export async function processTestRequest(
  tweetUrl: string,
  mainPrompt: string,
  refinePrompt: string,
): Promise<{ answer: string; short: string }> {
  const tweetId = tweetUrl.split('/').pop();
  if (!tweetId) throw new Error('Invalid Tweet URL');

  const tweetToActionOn = await getTweet({ id: tweetId });
  let content = `@${tweetToActionOn.author.userName}: ${tweetToActionOn.text}`;

  if (tweetToActionOn.quoted_tweet) {
    const quote = `@${tweetToActionOn.quoted_tweet.author.userName}: ${tweetToActionOn.quoted_tweet.text}`;
    content = `Quote: ${quote}\n\n${content}`;
  }

  const text = content;
  let autonomous = false;
  let threadMessages: any = tweetToActionOn.text;

  if (tweetToActionOn.inReplyToId) {
    threadMessages = await getTweetMessages({
      id: tweetToActionOn.inReplyToId,
    });
  }

  if (typeof threadMessages === 'string') {
    threadMessages = [{ role: 'user', content: threadMessages }];
    autonomous = true;
  }

  let bill: typeof billDbSchema.$inferSelect | null = null;
  let noContext = false;
  try {
    bill = await getReasonBillContext({ messages: threadMessages });
  } catch (err) {
    noContext = true;
  }

  const summary =
    !noContext && bill ? `${bill.title}: \n\n${bill.content}` : '';
  const response = await getAnswer(text, threadMessages, autonomous, summary, mainPrompt, refinePrompt);

  console.log(response);
  return { answer: response.firstLayer, short: response.finalAnswer };
}
