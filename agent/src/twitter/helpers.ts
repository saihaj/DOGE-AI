import { z } from 'zod';
import {
  REJECTION_REASON,
  TWITTER_API_BASE_URL,
  TWITTER_API_KEY,
} from '../const';
import { TweetForListResponse, TweetResponse } from '../inngest';
import { bento } from '../cache';
import { embed, embedMany, generateText, type Embedding } from 'ai';
import { openai } from '@ai-sdk/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import {
  db,
  eq,
  user as userDbSchema,
  chat as chatDbSchema,
  between,
} from 'database';
import * as crypto from 'node:crypto';
import { ANALYZE_TEXT_FROM_IMAGE } from './prompts';

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
 */
export async function getTweetContentAsText({ id }: { id: string }) {
  const CACHE_KEY = `tweet-content-${id}`;
  const cache = (await bento.get(CACHE_KEY)) as string;

  if (cache) return cache;

  const tweet = await getTweet({ id });

  const result: string[] = [];

  if (tweet.quoted_tweet) {
    const text = await getTweetContentAsText({ id: tweet.quoted_tweet.id });
    const quotedTweetText = `Quote: ${text}`;
    result.push(quotedTweetText);
  }

  const mainTweetText = `@${tweet.author.userName}: ${tweet.text}`;
  result.push(mainTweetText);

  if (tweet.extendedEntities?.media) {
    for (const media of tweet.extendedEntities.media) {
      if (!media) continue;
      if (!media.type) continue;

      // can only do photos for now
      if (media.type !== 'photo') continue;

      // we got no image url to work with
      if (!media?.media_url_https) continue;

      console.log('Media content found. Proceeding in media mode...');
      const { text } = await bento.getOrSet(
        `image-analysis-${media.media_url_https}`,
        async () => {
          return generateText({
            temperature: 0,
            model: openai('gpt-4o', {
              downloadImages: true,
            }),
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: ANALYZE_TEXT_FROM_IMAGE },
                  { type: 'image', image: media.media_url_https! },
                ],
              },
            ],
          });
        },
      );

      if (text.toLowerCase().startsWith('no_text_found')) {
        console.warn('No text found in image');
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
