import { generateText, Message, StreamData } from 'ai';
import { TWEET_EXTRACT_REGEX } from '../const';
import { getTweetContentAsText } from '../twitter/helpers';
import { WithLogger } from '../logger';
import { openai } from '@ai-sdk/openai';
import dedent from 'dedent';
import * as crypto from 'node:crypto';

/**
 * Extracts tweet URL from a message, fetches the tweet content, and replaces the URL with the tweet text
 *
 * @param messages Array of message objects
 * @param userMessageText The text of the user's message
 * @param stream StreamData instance for appending data
 * @param log Logger instance
 * @returns Object with updated messages and whether a tweet was extracted
 */
export async function extractAndProcessTweet(
  messages: Message[],
  userMessageText: string,
  stream: StreamData,
  log: WithLogger,
): Promise<{ messages: Message[] }> {
  // Create a copy of the messages array to avoid mutating the original
  const updatedMessages = [...messages];
  const extractedTweetUrl = userMessageText.match(TWEET_EXTRACT_REGEX);

  if (!extractedTweetUrl) {
    return { messages: updatedMessages };
  }

  const tweetUrl = extractedTweetUrl[0];
  log.info({ url: tweetUrl }, 'extracted tweet');

  const url = new URL(tweetUrl);
  const tweetId = url.pathname.split('/').pop();
  log.info({ tweetId }, 'tweetId');

  if (!tweetId) {
    return { messages: updatedMessages };
  }

  try {
    const tweetText = await getTweetContentAsText({ id: tweetId }, log);

    // Append the tweet content to the stream
    stream.append({
      role: 'tweet',
      content: tweetText,
    });

    // Replace the tweet URL with the tweet text in the user message
    const updatedMessageText = userMessageText.replace(
      TWEET_EXTRACT_REGEX,
      `"${tweetText}"`,
    );

    log.info({ updatedMessageText }, 'swap tweet url with extracted text');

    // Remove the last message (which contains the URL) and add the updated one
    const lastMessage = updatedMessages.pop();
    updatedMessages.push({
      role: 'user',
      content: updatedMessageText,
      id: lastMessage?.id || crypto.randomUUID(),
    });

    return { messages: updatedMessages };
  } catch (error) {
    log.error({ error, tweetId }, 'Failed to extract tweet content');
    return { messages: updatedMessages };
  }
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: Message;
}) {
  const { text: title } = await generateText({
    model: openai('gpt-4.1'),
    messages: [
      {
        role: 'system',
        content: dedent`\n
- you will generate a short title based on the first message a user begins a conversation with
- ensure it is not more than 80 characters long
- the title should be a summary of the user's message
- do not use quotes or colons`,
      },
      message,
    ],
  });

  return title;
}
