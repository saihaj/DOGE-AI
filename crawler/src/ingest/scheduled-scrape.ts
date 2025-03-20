import { inngest } from './client';

export const scheduledDogeWebsiteScrape = inngest.createFunction(
  { id: 'scheduled-doge-website-scrape' },
  { cron: 'TZ=America/New_York 0 0 * * 1-5' },
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
  },
);
