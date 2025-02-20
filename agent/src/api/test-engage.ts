import {
  getLongResponse,
  getShortResponse,
} from '../twitter/execute-interaction';
import { getTweetContentAsText } from '../twitter/helpers';
import Handlebars from 'handlebars';
import { Static, Type } from '@sinclair/typebox';
import { logger } from '../logger';
import { getKbContext } from '../twitter/knowledge-base';

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
  const log = logger.child({ module: 'processTestEngageRequest', tweetId });
  const content = await getTweetContentAsText({ id: tweetId }, log);

  const kb = await getKbContext(
    {
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      text: content,
    },
    log,
  );

  if (kb?.bill) {
    log.info(kb.bill, 'bill found');
  }

  const bill = kb?.bill ? `${kb.bill.title}: \n\n${kb.bill.content}` : '';
  const summary = kb?.documents ? `${kb.documents}\n\n${bill}` : bill || '';

  const { responseLong, metadata, formatted } = await getLongResponse({
    summary,
    text: content,
    systemPrompt: mainPrompt,
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

  log.info({ long: responseLong, short: refinedOutput, metadata });
  return {
    answer: formatted,
    short: refinedOutput,
    bill: summary,
  };
}
