import { Inngest } from 'inngest';

const inngest = new Inngest({ id: '@dogexbt/crawler' });

/**
 * Sends an event to Inngest with the given data.
 *
 * @param data - The event data. `text` is the quote topic/guide optional value..
 */
export async function sendInngestRequest(data: {
  type: 'quote' | 'retweet';
  itemId: Number;
  itemUrl: string;
  text?: string;
}) {
  try {
    // const eventName = data.type === 'quote' ? 'quote' : 'retweet';

    // await inngest.send({
    //   name: eventName,
    //   data,
    // });

    console.log('Inngest event sent:', data);
  } catch (err) {
    console.error('Error sending Inngest event:', err);
    throw err;
  }
}
