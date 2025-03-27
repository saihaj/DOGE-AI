import { inngest } from '../ingest';

async function main() {
  const ingestSent = await inngest.send([
    {
      name: 'web.imported',
      data: {
        url: 'https://doge.gov/savings',
        actions: [
          {
            selector: "//*[text()='Show All Agencies']",
            type: 'click',
          },
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

  console.log(`Sent ${ingestSent.ids} sent to Inngest.`);
}

main().catch(console.error);
