import { CoreMessage, StreamData } from 'ai';
import { TWEET_EXTRACT_REGEX } from '../const';
import { getTweetContentAsText } from '../twitter/helpers';
import { WithLogger } from '../logger';

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
  messages: CoreMessage[],
  userMessageText: string,
  stream: StreamData,
  log: WithLogger,
): Promise<{ messages: CoreMessage[] }> {
  // Create a copy of the messages array to avoid mutating the original
  const updatedMessages = [...messages];
  const extractedTweetUrl = userMessageText.match(TWEET_EXTRACT_REGEX);

  if (!extractedTweetUrl) {
    return { messages: updatedMessages, tweetProcessed: false };
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
    updatedMessages.pop();
    updatedMessages.push({ role: 'user', content: updatedMessageText });

    return { messages: updatedMessages };
  } catch (error) {
    log.error({ error, tweetId }, 'Failed to extract tweet content');
    return { messages: updatedMessages };
  }
}
