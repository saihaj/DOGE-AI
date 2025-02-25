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
          {
            selector: 'Load more agencies',
            type: 'click',
          },
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
