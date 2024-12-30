import { serve } from 'inngest/next';
import { functions, inngest } from '../src/ingest';

export default serve({ client: inngest, functions });
