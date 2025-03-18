import { inngest } from './client';

export const scheduledScrape = inngest.createFunction(
  { id: 'scheduled-scrape' },
  { cron: '0 0 * * *' }, // Runs daily at midnight UTC
  async ({ step }) => {
    await step.sendEvent('send-scrape-events', [
      {
        name: 'web.imported',
        data: {
          url: 'https://doge.gov/savings',
          actions: [
            { selector: "//*[text()='Show All Agencies']", type: 'click' },
            { selector: "//*[text()='View All Contracts']", type: 'click' },
            { selector: "//*[text()='View All Grants']", type: 'click' },
            { selector: "//*[text()='View All Leases']", type: 'click' },
          ],
        },
      },
      {
        name: 'web.imported',
        data: {
          url: 'https://doge.gov/regulations',
          actions: [
            { type: 'click', selector: "//*[text()='Load More Agencies']" },
            { type: 'wait', milliseconds: 500 },
            { type: 'click', selector: "//*[text()='Load More Agencies']" },
            { type: 'wait', milliseconds: 500 },
            { type: 'click', selector: "//*[text()='Load More Agencies']" },
            { type: 'wait', milliseconds: 500 },
            { type: 'click', selector: "//*[text()='Load More Agencies']" },
            { type: 'wait', milliseconds: 500 },
            { type: 'click', selector: "//*[text()='Load More Agencies']" },
            { type: 'wait', milliseconds: 500 },
            { type: 'click', selector: "//*[text()='Load More Agencies']" },
            { type: 'wait', milliseconds: 500 },
          ],
        },
      },
      {
        name: 'web.imported',
        data: {
          url: 'https://doge.gov/spend',
        },
      },
    ]);
  }
);