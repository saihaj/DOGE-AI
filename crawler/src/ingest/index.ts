import { embedBill } from './embed-bill';
import { processBill } from './process-bill';
import { processDocument } from './process-document';
import { processWebpage } from './process-web';
import { scheduledScrape } from './scheduled-scrape';

export const functions = [
  processBill,
  embedBill,
  processDocument,
  processWebpage,
  scheduledScrape
];

export { inngest } from './client';
