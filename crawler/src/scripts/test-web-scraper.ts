import { FC_API_KEY } from '@/const';
import FirecrawlApp from '@mendable/firecrawl-js';

const app = new FirecrawlApp({ apiKey: FC_API_KEY });

async function main() {
  const crawlResponse = await app.scrapeUrl('https://doge.gov/savings', {
    formats: ['markdown'],
    actions: [
      {
        type: 'click',
        selector: 'see more',
      },
    ],
  });

  if (!crawlResponse.success) {
    throw new Error(`Failed to crawl: ${crawlResponse.error}`);
  }
}

main().catch(console.error);
