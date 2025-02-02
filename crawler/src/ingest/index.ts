import { embedBill } from './embed-bill';
import { processBill } from './process-bill';
import { processDocument } from './process-document';

export const functions = [processBill, embedBill, processDocument];

export { inngest } from './client';
