import { embedBill } from './embed-bill';
import { processBill } from './process-bill';
import { processDocument } from './process-document';
import { processWebpage } from './process-web';
import { scheduledDogeWebsiteScrape } from './scheduled-scrape';

export const functions = [
  processBill,
  embedBill,
  processDocument,
  processWebpage,
  scheduledDogeWebsiteScrape,
];

export { inngest } from './client';
