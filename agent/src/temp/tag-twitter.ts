import * as readline from 'node:readline/promises';
import { getReasonBillContext } from '../twitter/execute-interaction';
import { CoreMessage } from 'ai';
import { PROMPTS } from '../twitter/prompts';
import { generateReply, generateShortenedReply } from '../twitter/execute';
import { logger } from '../logger';
import { mergeConsecutiveSameRole } from '../twitter/helpers';

const log = logger.child({ module: 'cli-tag-twitter' });

/**
 * Testing tags on a tweet where DOGEai gets pinged.
 */
async function main() {
  const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const question = await terminal.question('Enter your question: ');
    terminal.close();

    const bill = await getReasonBillContext(
      {
        messages: [
          {
            role: 'user',
            content: question,
          },
        ],
      },
      log,
    ).catch(_ => {
      return null;
    });

    const summary = bill ? `${bill.title}: \n\n${bill.content}` : '';
    if (bill) {
      log.info(
        {
          billId: bill.id,
          billTitle: bill.title,
        },
        'found bill',
      );
    }
    const messages: Array<CoreMessage> = [];

    if (summary) {
      messages.push({
        role: 'user',
        content: `Context from database: ${summary}\n\n`,
      });
    }

    const content = await PROMPTS.REPLY_TWEET_QUESTION_PROMPT({
      question: question,
    });
    messages.push({
      role: 'user',
      content,
    });

    const mergedMessages = mergeConsecutiveSameRole(messages);
    log.info(mergedMessages, 'context given');

    const { text, metadata } = await generateReply({ messages });

    if (metadata) {
      console.log('\n\nMetadata: ', metadata, '\n\n');
    }

    console.log('\n\nLong: ', text, '\n\n');
    const { text: short } = await generateShortenedReply({ message: text });
    console.log('\n\nShort: ', short, '\n\n');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main().catch(console.error);
