import {
  getLongResponse,
  getShortResponse,
} from '../twitter/execute-interaction';
import { getTweetContentAsText } from '../twitter/helpers';
import Handlebars from 'handlebars';
import { Static, Type } from '@sinclair/typebox';
import { logger } from '../logger';
import { getKbContext } from '../twitter/knowledge-base';
import { OPENAI_API_KEY } from '../const';

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
  const text = await getTweetContentAsText({ id: tweetId }, log);

  const kb = await getKbContext(
    {
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
      text,
      billEntries: true,
      documentEntries: true,
      manualEntries: 'agent',
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

  const bill = kb?.bill ? `${kb.bill.title}: \n\n${kb.bill.content}` : '';
  const summary = (() => {
    let result = ' ';

    if (kb.manualEntries) {
      result += 'Knowledge base entries:\n';
      result += kb.manualEntries;
      result += '\n\n';
    }

    if (kb.documents) {
      result += kb.documents;
      result += '\n\n';
    }

    if (bill) {
      result += bill;
      result += '\n\n';
    }

    return result.trim();
  })();

  const { formatted, metadata, raw } = await getLongResponse(
    {
      summary,
      text,
      systemPrompt: mainPrompt,
    },
    {
      log,
      method: 'processTestEngageRequest',
      action: 'api',
    },
  );

  if (refinePrompt) {
    refinePrompt = Handlebars.compile(refinePrompt)({
      topic: raw,
    });
  }

  const refinedOutput = await getShortResponse({
    topic: raw,
    refinePrompt,
  });

  log.info({ long: formatted, short: refinedOutput, metadata });
  return {
    answer: formatted,
    short: refinedOutput,
    bill: summary,
  };
}
