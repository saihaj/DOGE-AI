import { writeFile } from 'node:fs/promises';
import * as readline from 'node:readline/promises';
import { getTweetContentAsText } from '../twitter/helpers';
import {
  getLongResponse,
  getShortResponse,
} from '../twitter/execute-interaction';
import { logger } from '../logger';
import { getKbContext } from '../twitter/knowledge-base';

const log = logger.child({ module: 'cli-engage-twitter' });

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

    const content = await getTweetContentAsText({ id: tweetId }, log);

    await writeFile(`dev-test/apitweet.txt`, JSON.stringify(content));

    const kb = await getKbContext(
      {
        messages: [
          {
            role: 'user',
            content,
          },
        ],
        text: content,
      },
      log,
    );

    if (kb?.bill) {
      log.info(
        {
          billId: kb.bill.id,
          billTitle: kb.bill.title,
        },
        'found bill',
      );
    }

    const bill = kb?.bill ? `${kb.bill.title}: \n\n${kb.bill.content}` : '';
    const summary = kb?.documents ? `${kb.documents}\n\n${bill}` : bill || '';

    const { responseLong, metadata, formatted } = await getLongResponse(
      {
        summary,
        text: content,
      },
      {
        log,
        method: 'engage-twitter',
        action: 'cli',
      },
    );

    if (metadata) {
      console.log('\n\nMetadata: ', metadata, '\n\n');
    }

    console.log('\n\nLong Response: ', responseLong, '\n\n');
    console.log('\n\nLong formatted gpt-4o: ', formatted, '\n\n');

    const refinedOutput = await getShortResponse({ topic: responseLong });

    console.log('\n\nShort Response: ', refinedOutput, '\n\n');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main().catch(console.error);
