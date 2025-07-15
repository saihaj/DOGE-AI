import { z } from 'zod';
import {
  REJECTION_REASON,
  SEED,
  TEMPERATURE,
  TWITTER_API_BASE_URL,
  TWITTER_API_KEY,
} from '../const';
import { TweetForListResponse, TweetResponse } from '../inngest';
import { bento } from '../cache';
import {
  CoreMessage,
  embed,
  embedMany,
  generateText,
  type Embedding,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { db, eq, user as userDbSchema, chat as chatDbSchema } from 'database';
import * as crypto from 'node:crypto';
import {
  ANALYZE_TEXT_FROM_IMAGE,
  PROMPTS,
  QUESTION_EXTRACTOR_SYSTEM_PROMPT,
} from './prompts';
import { WithLogger } from '../logger';
import { anthropic } from '@ai-sdk/anthropic';
import { getUnixTime, toDate } from 'date-fns';

// Ada V2 31.4% vs 54.9% large
const embeddingModel = openai.textEmbeddingModel('text-embedding-3-small');

const GetTweetResponse = z.object({
  tweets: z.array(TweetResponse),
});

const API = new URL(TWITTER_API_BASE_URL);
export async function getTweet({ id }: { id: string }) {
  API.pathname = '/twitter/tweets';
  return bento.getOrSet(`/tweet/${id}`, async () => {
    API.searchParams.set('tweet_ids', id);

    const data = await fetch(`${API.toString()}`, {
      headers: {
        'X-API-Key': TWITTER_API_KEY,
      },
    });

    const json = await data.json();
    const tweet = await GetTweetResponse.safeParseAsync(json);
    if (tweet.error) {
      throw new Error(REJECTION_REASON.FAILED_TO_PARSE_RESPONSE, {
        cause: tweet.error.message,
      });
    }

    // Likely can happen if the tweet was deleted
    if (tweet.data.tweets.length === 0) {
      throw new Error(REJECTION_REASON.NO_TWEET_RETRIEVED);
    }

    return tweet.data.tweets[0];
  });
}

/**
 * Given a tweet it will recurse the quote tweet.
 * It extracts any media and runs it through the AI any textual information
 *
 * Return you should get a string with the content of the tweet with full context
 *
 * Added safety to ensure we do not recurse more than 2 quote tweets.
 */
export async function getTweetContentAsText(
  { id }: { id: string },
  log: WithLogger,
  depth = 0,
  maxDepth = 2,
) {
  if (depth >= maxDepth) {
    log.warn({ id }, 'max depth reached for tweet');
    return REJECTION_REASON.MAX_RECURSION_DEPTH_REACHED;
  }

  const CACHE_KEY = `tweet-content-${id}`;
  const cache = (await bento.get(CACHE_KEY)) as string;

  if (cache) return cache;

  const tweet = await getTweet({ id });
  const result: string[] = [];

  if (tweet.quoted_tweet) {
    const text = await getTweetContentAsText(
      { id: tweet.quoted_tweet.id },
      log,
      depth + 1,
      maxDepth,
    );

    if (text !== REJECTION_REASON.MAX_RECURSION_DEPTH_REACHED) {
      result.push(`Quote: ${text}`);
    }
  }

  const mainTweetText = `@${tweet.author.userName}: ${tweet.text}`;
  result.push(mainTweetText);

  if (tweet.extendedEntities?.media) {
    for (const media of tweet.extendedEntities.media) {
      if (!media?.type || media.type !== 'photo' || !media?.media_url_https) {
        continue;
      }

      log.info(
        {
          mediaUrl: media.media_url_https,
        },
        'processing media',
      );

      const { text } = await bento.getOrSet(
        `image-analysis-${media.media_url_https}`,
        async () => {
          return generateText({
            temperature: TEMPERATURE,
            model: openai('gpt-4o-mini', { downloadImages: true }),
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: ANALYZE_TEXT_FROM_IMAGE },
                  // we bail early but TS not smart enough to know
                  { type: 'image', image: media.media_url_https! },
                ],
              },
            ],
          });
        },
      );

      if (text.toLowerCase().startsWith('no_text_found')) {
        log.warn({}, 'no text found in image');
        continue;
      }
      result.push(`Image: ${text}`);
    }
  }

  const content = result.join('\n\n');

  await bento.set(CACHE_KEY, content, { ttl: '1d' });

  return content;
}

export const generateEmbedding = async (value: string): Promise<Embedding> => {
  const input = value.replaceAll('\\n', ' ');
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

export const generateEmbeddings = async (
  data: string[],
): Promise<Embedding[]> => {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: data,
  });
  return embeddings;
};

export const SearchResultResponseSchema = z.object({
  tweets: z.array(TweetResponse),
  has_next_page: z.boolean(),
  next_cursor: z.string().nullable(),
});

export const ListResultResponseSchema = z.object({
  tweets: z.array(TweetForListResponse),
  has_next_page: z.boolean(),
  next_cursor: z.string().nullable(),
});

export const textSplitter = new RecursiveCharacterTextSplitter({
  // Recommendations from ChatGPT
  chunkSize: 512,
  chunkOverlap: 100,
});

export async function upsertUser({ twitterId }: { twitterId: string }) {
  const user = await db.query.user.findFirst({
    where: eq(userDbSchema.twitterId, twitterId),
    columns: {
      id: true,
    },
  });

  if (user) {
    return user;
  }

  const created = await db
    .insert(userDbSchema)
    .values({
      id: crypto.randomUUID(),
      twitterId,
    })
    .returning({ id: userDbSchema.id });

  const [result] = created;
  return result;
}

export async function upsertChat({
  user,
  tweetId,
}: {
  user: string;
  tweetId: string;
}) {
  const lookupChat = await db.query.chat.findFirst({
    where: eq(chatDbSchema.tweetId, tweetId),
    columns: {
      id: true,
    },
  });

  if (lookupChat) {
    return lookupChat;
  }

  const chat = await db
    .insert(chatDbSchema)
    .values({
      id: crypto.randomUUID(),
      user,
      tweetId,
    })
    .returning({ id: chatDbSchema.id });

  return chat[0];
}

export function mergeConsecutiveSameRole(
  messages: CoreMessage[],
): CoreMessage[] {
  if (messages.length === 0) {
    return [];
  }

  const merged: CoreMessage[] = [];

  for (const current of messages) {
    if (merged.length === 0) {
      merged.push(current);
    } else {
      const last = merged[merged.length - 1];

      if (last.role === current.role) {
        // Merge the string content
        last.content += '\n\n' + current.content;
      } else {
        merged.push(current);
      }
    }
  }

  return merged;
}

export async function longResponseFormatter(text: string) {
  const prompt = await PROMPTS.LONG_RESPONSE_FORMATTER_PROMPT();

  const { text: _responseLong } = await generateText({
    model: openai('gpt-4.1'),
    temperature: TEMPERATURE,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: text },
    ],
  });

  const responseLong = sanitizeLlmOutput(_responseLong);

  return responseLong;
}

export async function engagementHumanizer(text: string) {
  const prompt = await PROMPTS.ENGAGEMENT_HUMANIZER({ text });

  const { text: _result } = await generateText({
    model: anthropic('claude-3-5-sonnet-latest'),
    temperature: TEMPERATURE,
    messages: [{ role: 'user', content: prompt }],
  });

  const result = sanitizeLlmOutput(_result);

  return result;
}

export async function questionExtractor(message: CoreMessage) {
  const { text } = await generateText({
    model: openai('gpt-4.1-nano'),
    temperature: TEMPERATURE,
    seed: SEED,
    messages: [
      {
        role: 'system',
        content: QUESTION_EXTRACTOR_SYSTEM_PROMPT,
      },
      message,
    ],
  });

  return text;
}

export function sanitizeLlmOutput(text: string) {
  return text
    .trim()
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/\[\d+\]/g, '')
    .replace(/<\/?response_format>|<\/?mimicked_text>/g, '')
    .replace(/^(\n)+/, '')
    .replace(/#\w+/g, '') // remove hashtags
    .replace(/[\[\]]/g, '')
    .replace(/^\s*(new line|line break)\s/gm, '') // remove 'new line' and any extra whitespace/line break
    .replace(/DOGEai:/gi, '') // 'DOGEai:' prefix
    .replace(/CityDeskNYC:/gi, '') // 'CityDeskNYC:' prefix
    .replace(/^\s*source(s)?:\s*$/gim, '') // sources
    .replace(/^(\[)?Final Response:(\])?\s*/i, '') // final response prefix
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold (**text** or __text__)
    .replace(/(\*|_)(.*?)\1/g, '$2') // Italics (*text* or _text_)
    .trim();
}

/**
 * Given a tweet id, it will return the time since the tweet was created
 */
export function getTimeInSecondsElapsedSinceTweetCreated(
  tweet: Awaited<ReturnType<typeof getTweet>>,
) {
  const createdAt = getUnixTime(toDate(tweet.createdAt));
  const now = getUnixTime(new Date());

  const delta = now - createdAt;

  return delta;
}
