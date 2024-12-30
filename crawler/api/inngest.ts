import { serve } from 'inngest/next';
import { functions, inngest } from '../src/ingest/index.js';

export default serve({ client: inngest, functions });
