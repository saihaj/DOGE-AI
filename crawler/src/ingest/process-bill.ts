import { API_KEY, HEADERS } from '../const';
import { inngest } from './client';
import { z } from 'zod';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { prisma } from '../prisma';

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

export const processBill = inngest.createFunction(
  { id: 'process-bill' },
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

    const fetchBillText = await step.run('fetch-bill-text', async () => {
      const url = new URL(info.htmlVersionUrl);

      // Get the bill text from the API
      const response = await fetch(url.toString(), {
        headers: HEADERS,
      });
      const data = await response.text();
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
      return prisma.bill.create({
        data: {
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
        },
        select: {
          id: true,
        },
      });
    });

    return { billInfo: info };
  },
);
