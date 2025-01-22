import { API_KEY, HEADERS } from '../const';
import { inngest } from './client';
import { z } from 'zod';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { NonRetriableError } from 'inngest';
import { db, bill as billDbSchema } from 'database';

const billInfoResponse = z.object({
  request: z.object({
    billNumber: z.union([z.string(), z.number()]).pipe(z.coerce.number()),
    billType: z.string(),
    billUrl: z.string(),
    congress: z.union([z.string(), z.number()]).pipe(z.coerce.number()),
    contentType: z.string(),
    format: z.string(),
  }),
  textVersions: z.array(
    z.object({
      date: z.string().nullable(),
      formats: z.array(z.object({ type: z.string(), url: z.string() })),
      type: z.string().nullable(),
    }),
  ),
});

const billSponsorsResponse = z.object({
  bill: z.object({
    introducedDate: z.string(),
    updateDate: z.string(),
    updateDateIncludingText: z.string(),
    constitutionalAuthorityStatementText: z.string().optional(),
    // In senate bills I found this field being returned.
    laws: z
      .array(
        z.object({
          number: z.string(),
          type: z.string(),
        }),
      )
      .optional(),
    // --------------- //
    // Saw this in senate bills
    subjects: z
      .object({
        count: z.union([z.string(), z.number()]).pipe(z.coerce.number()),
        url: z.string(),
      })
      .optional(),
    summaries: z
      .object({
        count: z.union([z.string(), z.number()]).pipe(z.coerce.number()),
        url: z.string(),
      })
      .optional(),
    policyArea: z
      .object({
        name: z.string(),
      })
      .optional(),
    // --------------- //
    cosponsors: z
      .object({
        count: z.union([z.string(), z.number()]).pipe(z.coerce.number()),
        countIncludingWithdrawnCosponsors: z
          .union([z.string(), z.number()])
          .pipe(z.coerce.number()),
        url: z.string(),
      })
      .optional(),
    latestAction: z.object({
      actionDate: z.string(),
      text: z.string(),
    }),
    actions: z.object({
      count: z.union([z.string(), z.number()]).pipe(z.coerce.number()),
      url: z.string(),
    }),
    // Some senate bills don't even have this...
    committees: z
      .object({
        count: z.union([z.string(), z.number()]).pipe(z.coerce.number()),
        url: z.string(),
      })
      .optional(),
    titles: z.object({
      count: z.union([z.string(), z.number()]).pipe(z.coerce.number()),
      url: z.string(),
    }),
    sponsors: z.array(
      z.object({
        bioguideId: z.string(),
        firstName: z.string(),
        fullName: z.string(),
        isByRequest: z.string(),
        lastName: z.string(),
        party: z.string(),
        state: z.string(),
        url: z.string(),
      }),
    ),
  }),
});

export const processBill = inngest.createFunction(
  {
    id: 'process-bill',
    // this will ensure our processing rate is 1000/hour
    throttle: {
      limit: 1000,
      period: '1h',
    },
  },
  { event: 'bill.imported' },
  async ({ event, step }) => {
    const bill = event.data;

    const info = await step.run('get-bill-info', async () => {
      const url = new URL(bill.url);
      url.pathname = url.pathname + '/text';
      url.searchParams.set('api_key', API_KEY);
      // Get the bill info from the API
      const response = await fetch(url.toString(), {
        headers: HEADERS,
      });
      const data = await response.json();
      const result = await billInfoResponse.safeParseAsync(data);

      if (!result.success) {
        throw new Error('Failed to parse bill info response', {
          cause: result.error,
        });
      }
      const info = result.data;

      if (info.textVersions.length === 0) {
        throw new NonRetriableError('No text versions found', {
          cause: `Bill text versions count: ${info.textVersions.length}`,
        });
      }

      const htmlVersionUrl = info.textVersions?.[0].formats.filter(
        f => f.type === 'Formatted Text',
      )?.[0].url;

      const pdfVersionUrl = info.textVersions?.[0].formats.filter(
        f => f.type === 'PDF',
      )?.[0].url;

      const xmlVersionUrl = info.textVersions?.[0].formats.filter(
        f => f.type === 'Formatted XML',
      )?.[0].url;

      return {
        htmlVersionUrl,
        pdfVersionUrl,
        xmlVersionUrl,
        billNumber: info.request.billNumber,
      };
    });

    const sponsors = await step.run('get-bill-sponsors', async () => {
      const url = new URL(bill.url);
      url.searchParams.set('api_key', API_KEY);
      // Get the bill info from the API
      const response = await fetch(url.toString(), {
        headers: HEADERS,
      });

      const data = await response.json();

      const result = await billSponsorsResponse.safeParseAsync(data);

      if (!result.success) {
        throw new Error('Failed to parse bill sponsors response', {
          cause: result.error,
        });
      }

      // the first one in the list we consider the sponsor.
      const primarySponsor = result.data.bill.sponsors?.[0];

      if (!primarySponsor) {
        throw new NonRetriableError('No primary sponsor found', {
          cause: `Bill sponsors count: ${result.data.bill.sponsors.length}`,
        });
      }

      return {
        data: result.data.bill,
        primarySponsor,
      };
    });

    const fetchBillText = await step.run('fetch-bill-text', async () => {
      const url = new URL(info.htmlVersionUrl);
      // Get the bill text from the API
      const response = await fetch(url.toString(), {
        headers: HEADERS,
      });
      const data = await response.text();

      // Poor man's way to detect rate limit
      // I could see if there is HTTP status code but initially I had no way to grab those
      if (
        data.includes(
          '<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title>',
        )
      ) {
        throw Error("Rate limited; trying to fetch bill's text", {
          cause: `HTTP response: ${response.status}`,
        });
      }

      return data;
    });

    const summarizeBill = await step.run('summarize-bill', async () => {
      const result = await generateObject({
        model: google('gemini-1.5-flash-8b'),
        schema: z.object({
          summary: z.string(),
          impact: z.string(),
          fundingAnalysis: z.string(),
          spendingAnalysis: z.string(),
        }),
        messages: [
          {
            role: 'system',
            content: `
    1. Read and comprehend the provided bill text thoroughly.
    2. Summarize the Bill's Purpose:
       - Briefly describe the main goal or objective of the bill in simple, everyday language.
       - Avoid legal jargon.
    3. Analyze Impacts on Citizens:
       - Explain how the bill's provisions will likely affect the daily lives of citizens.
       - Consider both potential benefits and drawbacks.
       - Provide concrete examples to illustrate the significance of these impacts (e.g., "This bill could increase healthcare costs for families by [amount]," or "This bill may improve access to affordable housing for low-income residents").
    4. Assess Funding:
      - Determine if the bill includes any provisions for funding.
      - If no funding is allocated, state "NO_FUNDING_ALLOCATED."
    5. Analyze Spending:
      - Identify the specific amounts allocated (e.g., dollar amounts, percentages).
      - Briefly analyze the proposed spending plan.
      - Explain the potential implications and usage of the allocated funds.
      - If the bill does not specify funding amounts or allocations, state "NOT_SPECIFIED."
    `,
          },
          {
            role: 'user',
            content: fetchBillText,
          },
        ],
      });

      return result.object;
    });

    const storeInDb = await step.run('store-in-db', async () => {
      const billData = {
        type: bill.type,
        number: info.billNumber,
        congress: bill.congress,
        originChamber: bill.originChamberCode,
        title: bill.title,
        url: bill.url,

        htmlVersionUrl: info.htmlVersionUrl,
        pdfVersionUrl: info.pdfVersionUrl,
        xmlVersionUrl: info.xmlVersionUrl,

        content: Buffer.from(fetchBillText),

        summary: summarizeBill.summary,
        impact: summarizeBill.impact,
        funding: summarizeBill.fundingAnalysis,
        spending: summarizeBill.spendingAnalysis,

        introducedDate: sponsors.data.introducedDate,
        updateDate: sponsors.data.updateDate,

        sponsorFirstName: sponsors.primarySponsor.firstName,
        sponsorLastName: sponsors.primarySponsor.lastName,
        sponsorParty: sponsors.primarySponsor.party,
        sponsorInfoRaw: Buffer.from(JSON.stringify(sponsors.data)),
      };

      return db
        .insert(billDbSchema)
        .values({ ...billData, id: crypto.randomUUID().toString() })
        .onConflictDoUpdate({
          set: billData,
          target: [
            billDbSchema.type,
            billDbSchema.number,
            billDbSchema.congress,
          ],
        })
        .returning();
    });

    return {
      billInfo: info,
      db: storeInDb?.[0].id,
      summary: summarizeBill,
      sponsors: sponsors.data,
    };
  },
);
