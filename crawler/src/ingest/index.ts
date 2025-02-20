import { embedBill } from './embed-bill';
import { processBill } from './process-bill';
import { processDocument } from './process-document';
import { processWebpage } from './process-web';

export const functions = [
  processBill,
  embedBill,
  processDocument,
  processWebpage,
];

export { inngest } from './client';
