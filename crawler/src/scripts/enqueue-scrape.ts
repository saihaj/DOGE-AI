import { inngest } from '../ingest';
import { Action } from '@mendable/firecrawl-js';

const page = 'https://doge.gov/savings';
const actions = [
  {
    selector: 'see more',
    type: 'click',
  },
] satisfies Action[];

async function main() {
  const ingestSent = await inngest.send([
    {
      name: 'web.imported',
      data: {
        url: page,
        actions,
      },
    },
  ]);

  console.log(`Sent ${ingestSent.ids} sent to Inngest.`);
}

main().catch(console.error);
