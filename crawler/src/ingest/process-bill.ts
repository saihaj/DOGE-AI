import { API_KEY, HEADERS } from '../const';
import { inngest } from './client';

export const processBill = inngest.createFunction(
  { id: 'process-bill' },
  { event: 'bill.imported' },
  async ({ event, step }) => {
    // Extract the bill from the event
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
      return data;
    });

    const fetchBillText = await step.run('fetch-bill-text', async () => {
      const textUrl = info.textVersions?.[0].formats.filter(
        f => f.type === 'Formatted Text',
      )?.[0].url;
      const url = new URL(textUrl);

      // Get the bill text from the API
      const response = await fetch(url.toString(), {
        headers: HEADERS,
      });
      const data = await response.text();
      return data;
    });

    return { billInfo: info.bill };
  },
);
