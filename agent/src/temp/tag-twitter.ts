import * as readline from 'node:readline/promises';
import { CoreMessage, generateText } from 'ai';
import { PROMPTS } from '../twitter/prompts';
import { logger } from '../logger';
import { mergeConsecutiveSameRole } from '../twitter/helpers';
import { TEMPERATURE } from '../const';
import { openai } from '@ai-sdk/openai';
import { getKbContext } from '../twitter/knowledge-base';

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

    const kb = await getKbContext(
      {
        messages: [
          {
            role: 'user',
            content: question,
          },
        ],
        text: question,
      },
      log,
    );

    const summary = kb?.bill ? `${kb.bill.title}: \n\n${kb.bill.content}` : '';
    const messages: Array<CoreMessage> = [];

    if (kb?.documents) {
      messages.push({
        role: 'user',
        content: `Documents Context: ${kb.documents}\n\n`,
      });
    }

    if (summary) {
      messages.push({
        role: 'user',
        content: `Bills Context: ${summary}\n\n`,
      });
    }

    const content = await PROMPTS.REPLY_TWEET_QUESTION_PROMPT({
      question,
      lastDogeReply: '',
      fullContext: '',
    });
    messages.push({
      role: 'user',
      content,
    });
    messages.push({
      role: 'user',
      content: `now answer this question: "${question}"`,
    });

    const mergedMessages = mergeConsecutiveSameRole(messages);
    log.info(mergedMessages, 'context given');

    const { text } = await generateText({
      temperature: TEMPERATURE,
      model: openai('gpt-4o'),
      messages,
    });

    console.log('\n\nLong: ', text, '\n\n');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main().catch(console.error);
