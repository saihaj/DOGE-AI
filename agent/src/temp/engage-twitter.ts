import { writeFile } from 'node:fs/promises';
import * as readline from 'node:readline/promises';
import { getTweetContentAsText } from '../twitter/helpers';
import {
  getLongResponse,
  getReasonBillContext,
  getShortResponse,
} from '../twitter/execute-interaction';

/**
 * This is a CLI version of `twitter/execute-interaction.ts`
 *
 * You give it a tweet you want to interact with and it will give you response.
 */
async function main() {
  const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const tweetUrl = await terminal.question('Enter the tweet URL: ');
    terminal.close();

    const tweetId = tweetUrl.split('/').pop();
    if (!tweetId) {
      throw new Error('No tweet ID found in the provided URL.');
    }

    const content = await getTweetContentAsText({ id: tweetId });

    await writeFile(`dev-test/apitweet.txt`, JSON.stringify(content));

    const bill = await getReasonBillContext({
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    }).catch(_ => {
      return null;
    });

    const summary = bill ? `${bill.title}: \n\n${bill.content}` : '';
    console.log(summary ? `\n\nBill found: ${summary}\n\n` : 'No bill found.');

    const { responseLong, metadata } = await getLongResponse({
      summary,
      text: content,
    });

    if (metadata) {
      console.log('\n\nMetadata: ', metadata, '\n\n');
    }

    console.log('\n\nLong Response: ', responseLong, '\n\n');

    const refinedOutput = await getShortResponse({ topic: responseLong });

    console.log('\n\nShort Response: ', refinedOutput, '\n\n');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main().catch(console.error);
