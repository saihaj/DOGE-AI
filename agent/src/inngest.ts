import { EventSchemas, Inngest, LiteralZodEventSchema } from 'inngest';
import { z } from 'zod';

const TweetBaseResponse = z.object({
  type: z.literal('tweet'),
  id: z.string(),
  url: z.string(),
  text: z.string(),
  retweetCount: z.number(),
  replyCount: z.number(),
  likeCount: z.number(),
  quoteCount: z.number(),
  createdAt: z.string(),
  isReply: z.boolean(),
  inReplyToId: z.string().nullable(),
  conversationId: z.string(),
  inReplyToUserId: z.string().nullable(),
  inReplyToUsername: z.string().nullable(),
  author: z.object({
    type: z.literal('user'),
    userName: z.string(),
    url: z.string(),
    id: z.string(),
    name: z.string(),
    isBlueVerified: z.boolean(),
    followers: z.number(),
    following: z.number(),
    createdAt: z.string(),
    possiblySensitive: z.boolean(),
    isAutomated: z.boolean(),
    automatedBy: z.string().nullable(),
    unavailable: z.string().nullish(),
    unavailableReason: z.string().nullish(),
  }),
  extendedEntities: z
    .object({
      media: z
        .array(
          z
            .object({
              display_url: z.string(),
              expanded_url: z.string(),
              id_str: z.string(),
              type: z.string(),
              url: z.string(),
              media_url_https: z.string().nullish(),
            })
            .nullish(),
        )
        .nullish(),
    })
    .nullish(),
});

export const TweetForListResponse = TweetBaseResponse.extend({
  quoted_tweet: z.object({}).nullable(),
});

export const TweetResponse = TweetBaseResponse.extend({
  quoted_tweet: z.lazy(() => TweetBaseResponse.nullable()).nullable(),
});

const processTweetEvent = z.object({
  name: z.literal('tweet.process'),
  data: TweetResponse,
}) satisfies LiteralZodEventSchema;

const baseExecuteTweetEvent = z.object({
  tweetId: z.string(),
  tweetUrl: z.string(),
});

const processInteractionTweetEvent = z.object({
  name: z.literal('tweet.process.interaction'),
  data: TweetForListResponse,
}) satisfies LiteralZodEventSchema;

const executeTweetEvent = z.object({
  name: z.literal('tweet.execute'),
  data: z.union([
    baseExecuteTweetEvent.extend({
      action: z.literal('tag'),
    }),
    baseExecuteTweetEvent.extend({
      action: z.literal('tag-summon'),
    }),
    baseExecuteTweetEvent.extend({ action: z.literal('reply') }),
  ]),
}) satisfies LiteralZodEventSchema;

const executeInteractionTweetEvent = z.object({
  name: z.literal('tweet.execute.interaction'),
  data: z.union([
    baseExecuteTweetEvent.extend({
      action: z.literal('quote'),
      text: z.string().nullish(),
    }),
    baseExecuteTweetEvent.extend({ action: z.literal('reply-engage') }),
  ]),
}) satisfies LiteralZodEventSchema;

// Create a client to send and receive events
export const inngest = new Inngest({
  id: '@dogexbt/agent',
  schemas: new EventSchemas().fromZod([
    processTweetEvent,
    executeTweetEvent,
    processInteractionTweetEvent,
    executeInteractionTweetEvent,
  ]),
});
