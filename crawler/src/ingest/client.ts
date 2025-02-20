import { Action } from '@mendable/firecrawl-js';
import { EventSchemas, Inngest } from 'inngest';

// Create a client to send and receive events
export const inngest = new Inngest({
  id: '@dogexbt/crawler',
  schemas: new EventSchemas().fromRecord<{
    'bill.imported': {
      data: {
        congress: number;
        number: string;
        originChamber: string;
        originChamberCode: string;
        title: string;
        type: string;
        updateDate: string;
        updateDateIncludingText: string;
        url: string;
      };
    };
    'bill.embed': {
      data: {
        id: string;
      };
    };
    'document.imported': {
      data: {
        url: string;
        title: string;
      };
    };
    'web.imported': {
      data: {
        url: string;
        actions?: Action[];
      };
    };
  }>(),
});
