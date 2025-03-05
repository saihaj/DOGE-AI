import { FC_API_KEY } from '@/const';
import FirecrawlApp, { ScrapeResponse } from '@mendable/firecrawl-js';

async function main() {
  const app = new FirecrawlApp({ apiKey: FC_API_KEY });

  // Scrape a website:
  const scrapeResult = (await app.scrapeUrl('https://doge.gov/savings', {
    formats: ['markdown'],
    actions: [
      {
        selector: "//*[text()='see more']",
        type: 'click',
      },
      {
        selector: "//*[text()='See more']",
        type: 'click',
      },
    ],
  })) as ScrapeResponse;

  if (!scrapeResult.success) {
    throw new Error(`Failed to scrape: ${scrapeResult.error}`);
  }

  
  console.log(scrapeResult);
}

main().catch(console.error);
