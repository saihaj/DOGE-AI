import * as readline from 'node:readline/promises';
import { CoreMessage } from 'ai';
import { REJECTION_REASON } from '../const';
import { PROMPTS } from '../twitter/prompts';
import { generateReply, getTweetContext } from '../twitter/execute';
import { logger } from '../logger';
import { getKbContext } from '../twitter/knowledge-base';
import { questionExtractor } from '../twitter/helpers';

const log = logger.child({ module: 'cli-reply-twitter' });

/**
 * Testing replies on a tweet where DOGEai gets pinged.
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

    const tweetThread = await getTweetContext({ id: tweetId }, log);
    const tweetWeRespondingTo = tweetThread.pop();

    if (!tweetWeRespondingTo) {
      throw new Error('No tweet found to respond to.');
    }

    const extractedQuestion =
      tweetWeRespondingTo.role === 'user'
        ? await questionExtractor({
            role: 'user',
            content: tweetWeRespondingTo.content,
          })
        : '';

    log.info({ extractedQuestion }, 'extracted question');

    if (extractedQuestion.startsWith(REJECTION_REASON.NO_QUESTION_DETECTED)) {
      throw new Error(REJECTION_REASON.NO_QUESTION_DETECTED);
    }
    const messages: Array<CoreMessage> = [];
    const fullThread = [...tweetThread, tweetWeRespondingTo!];
    const kb = await getKbContext(
      {
        messages: fullThread,
        text: extractedQuestion,
        billEntries: true,
        documentEntries: true,
        manualEntries: false,
      },
      log,
    );

    if (kb?.documents) {
      messages.push({
        role: 'user',
        content: `Documents Context: ${kb.documents}\n\n`,
      });
    }

    const summary = kb?.bill ? `${kb.bill.title}: \n\n${kb.bill.content}` : '';
    if (summary) {
      messages.push({
        role: 'user',
        content: `Bills Context: ${summary}\n\n`,
      });
    }

    const fullContext = tweetThread.map(({ content }) => content).join('\n\n');
    const previousTweet =
      tweetThread?.[tweetThread.length - 1]?.content.toString() || '';
    const content = await PROMPTS.REPLY_TWEET_QUESTION_PROMPT({
      question: extractedQuestion,
      lastDogeReply: previousTweet,
      fullContext,
    });
    messages.push({
      role: 'user',
      content,
    });
    messages.push({
      role: 'user',
      content: `now answer this question: "${extractedQuestion}"`,
    });

    log.info(
      {
        messages,
      },
      'context given',
    );

    const { text, metadata, formatted } = await generateReply(
      {
        messages,
      },
      {
        log,
        method: 'reply-twitter',
        action: 'cli',
      },
    );

    if (metadata) {
      console.log('\n\nMetadata: ', metadata, '\n\n');
    }
    console.log('\n\nResponse: ', text, '\n\n');
    console.log('\n\nFormatted: ', formatted, '\n\n');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main().catch(console.error);
