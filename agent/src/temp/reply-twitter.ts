import * as readline from 'node:readline/promises';
import { CoreMessage, generateText } from 'ai';
import {
  OPEN_ROUTER_API_KEY,
  REJECTION_REASON,
  SEED,
  TEMPERATURE,
} from '../const';
import { PROMPTS } from '../twitter/prompts';
import { getTweetContext } from '../twitter/execute';
import { logger } from '../logger';
import { getKbContext } from '../twitter/knowledge-base';
import { questionExtractor } from '../twitter/helpers';
import { getSearchResult } from '../twitter/web';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import * as crypto from 'node:crypto';

const log = logger.child({ module: 'cli-reply-twitter' });

const openrouter = createOpenRouter({
  apiKey: OPEN_ROUTER_API_KEY,
});

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
        manualEntries: true,
      },
      log,
    );

    if (kb?.documents) {
      messages.push({
        role: 'user',
        content: `Documents Context: ${kb.documents}\n\n`,
      });
    }

    const bill = kb?.bill ? `${kb.bill.title}: \n\n${kb.bill.content}` : '';
    const summary = (() => {
      let result = ' ';

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

    if (summary) {
      messages.push({ role: 'user', content: summary });
    }

    const fullContext = tweetThread.map(({ content }) => content).join('\n\n');

    const webSearchResults = await getSearchResult(
      {
        messages: [
          {
            role: 'user',
            content: fullContext,
          },
          {
            role: 'user',
            content: `now answer this question: "${extractedQuestion}"`,
          },
        ],
      },
      log,
    );

    const webResult = webSearchResults
      ?.map(
        result =>
          `Title: ${result.title}\nURL: ${result.url}\n\n Published Date: ${result.publishedDate}\n\n Content: ${result.text}\n\n`,
      )
      .join('');

    if (webResult) {
      messages.push({
        role: 'user',
        content: `Web search results:\n\n${webResult}`,
      });
    }

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

    // log.info(
    //   {
    //     messages,
    //   },
    //   'context given',
    // );

    const systemPrompt = await PROMPTS.TWITTER_REPLY_TEMPLATE_KB();
    const { text } = await generateText({
      temperature: TEMPERATURE,
      seed: SEED,
      model: openrouter.chat('deepseek/deepseek-r1', {
        reasoning: {
          effort: 'high',
        },
      }),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      experimental_generateMessageId: crypto.randomUUID,
    });

    console.log('\n\nResponse: ', text, '\n\n');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main().catch(console.error);
