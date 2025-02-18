import {
  getLongResponse,
  getReasonBillContext,
  getShortResponse,
} from '../twitter/execute-interaction';
import { getTweetContentAsText } from '../twitter/helpers';
import Handlebars from 'handlebars';
import { Static, Type } from '@sinclair/typebox';
import { logger } from '../logger';

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

  const bill = await getReasonBillContext(
    {
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    },
    log,
  ).catch(_ => {
    return null;
  });

  const summary = bill ? `${bill.title}: \n\n${bill.content}` : '';
  if (bill) {
    log.info(
      {
        billId: bill.id,
        billTitle: bill.title,
      },
      'found bill',
    );
  }

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
