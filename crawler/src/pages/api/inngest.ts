import { functions, inngest } from '@/ingest';
import { serve } from 'inngest/next';

export default serve({ client: inngest, functions });
