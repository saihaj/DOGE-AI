import { Message, StreamData, tool } from 'ai';
import { z } from 'zod';
import { ACTIVE_CONGRESS, CHAT_OPENAI_API_KEY } from '../const';
import { bill, db, eq } from 'database';
import { getKbContext } from '../twitter/knowledge-base';
import { getSearchResult } from '../twitter/web';
import { WithLogger } from '../logger';

/**
 * Returns shared tools for chat interfaces
 *
 * @param messages Current chat messages
 * @param log Logger instance
 * @param stream Optional StreamData instance for appending data
 * @returns Object containing tool definitions
 */
export function getChatTools(
  messages: Message[],
  log: WithLogger,
  stream?: StreamData,
) {
  return {
    web: tool({
      description: 'Browse the web',
      parameters: z.object({
        query: z.string(),
      }),
      execute: async ({ query }) => {
        log.info({ query }, 'query for web tool call');
        const webSearchResults = await getSearchResult(
          {
            type: 'chat',
            messages: [
              {
                role: 'user',
                content: query,
              },
            ],
          },
          log,
        );

        if (webSearchResults) {
          const webResult = webSearchResults
            .map(
              result =>
                `Title: ${result.title}\nURL: ${result.url}\n\n Published Date: ${result.publishedDate}\n\n Content: ${result.text}\n\n`,
            )
            .join('');

          const urls = webSearchResults.map(result => result.url);

          // If stream is provided, append sources
          if (stream) {
            stream.append({ role: 'sources', content: urls });
          }

          return webResult;
        }

        return null;
      },
    }),
    bill: tool({
      description: 'Get Bill from Congress',
      parameters: z.object({
        query: z.string(),
      }),
      execute: async ({ query }) => {
        const kb = await getKbContext(
          {
            // @ts-expect-error - TODO: satisfy some other day
            messages: messages,
            text: query,
            manualEntries: false,
            billEntries: true,
            documentEntries: false,
            openaiApiKey: CHAT_OPENAI_API_KEY,
          },
          log,
        );

        if (kb?.bill) {
          return kb.bill;
        }

        return null;
      },
    }),
    latestBills: tool({
      description: 'Get latest bills from Congress',
      parameters: z.object({
        count: z.number(),
      }),
      execute: async ({ count }) => {
        log.info({ count }, 'latest bills tool call');
        const _bills = await db.query.bill.findMany({
          where: eq(bill.congress, ACTIVE_CONGRESS),
          limit: count || 1,
          orderBy: (bill, { desc }) => desc(bill.introducedDate),
          columns: {
            id: true,
            title: true,
            content: true,
          },
        });

        const bills = _bills.map(bill => ({
          ...bill,
          // @ts-expect-error ignore type
          content: Buffer.from(bill.content).toString(),
        }));

        if (bills.length > 0) {
          return bills;
        }

        return null;
      },
    }),
    randomBills: tool({
      description: 'Get random bills from active Congress',
      parameters: z.object({
        count: z.number(),
      }),
      execute: async ({ count }) => {
        log.info({ count }, 'random bills tool call');
        const _bills = await db.query.bill.findMany({
          where: eq(bill.congress, ACTIVE_CONGRESS),
          limit: count || 1,
          orderBy: (_, { sql }) => sql`RANDOM()`,
          columns: {
            id: true,
            title: true,
            content: true,
          },
        });

        const bills = _bills.map(bill => ({
          ...bill,
          // @ts-expect-error ignore type
          content: Buffer.from(bill.content).toString(),
        }));

        if (bills.length > 0) {
          return bills;
        }

        return null;
      },
    }),
  };
}
