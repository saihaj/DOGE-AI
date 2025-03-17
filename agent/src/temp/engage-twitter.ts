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
        billEntries: true,
        documentEntries: true,
        manualEntries: true,
      },
      log,
    );

    const bill = kb?.bill ? `${kb.bill.title}: \n\n${kb.bill.content}` : '';
    const summary = (() => {
      let result = '';

      if (kb.manualEntries) {
        result += 'Knowledge base entries:\n';
        result += kb.manualEntries;
        result += '\n\n';
      }

      if (kb.documents) {
        result += kb.documents;
        result += '\n\n';
      }

      if (bill) {
        result += bill;
        result += '\n\n';
      }

      return result.trim();
    })();

    const { metadata, formatted, raw } = await getLongResponse(
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

    console.log('\n\nLong: ', formatted, '\n\n');

    const refinedOutput = await getShortResponse({ topic: raw });

    console.log('\n\nShort: ', refinedOutput, '\n\n');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main().catch(console.error);
