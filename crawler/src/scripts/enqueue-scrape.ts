import { inngest } from '../ingest';

async function main() {
  const ingestSent = await inngest.send([
    {
      name: 'web.imported',
      data: {
        url: 'https://doge.gov/savings',
        actions: [
          {
            selector: 'see more',
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
          { type: 'click', selector: 'Load more agencies' },
          { type: 'wait', milliseconds: 500 },
          { type: 'click', selector: 'Load more agencies' },
          { type: 'wait', milliseconds: 500 },
          { type: 'click', selector: 'Load more agencies' },
          { type: 'wait', milliseconds: 500 },
          { type: 'click', selector: 'Load more agencies' },
          { type: 'wait', milliseconds: 500 },
          { type: 'click', selector: 'Load more agencies' },
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
