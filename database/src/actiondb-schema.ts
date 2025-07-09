import { sql } from 'drizzle-orm';
import {
  blob,
  index,
  numeric,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export const ActionDbTweetConversation = sqliteTable(
  'TweetConversation',
  {
    id: text().primaryKey().notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    user: text()
      .notNull()
      .references(() => ActionDbTweetUser.id, { onDelete: 'cascade' }),
    tweetId: text(),
  },
  table => [index('tweet_idx').on(table.tweetId)],
);

export const ActionDbTweetMessage = sqliteTable(
  'TweetMessage',
  {
    id: text().primaryKey().notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    role: text().notNull(),
    chat: text()
      .notNull()
      .references(() => ActionDbTweetConversation.id, { onDelete: 'cascade' }),
    text: text().notNull(),
    tweetId: text(),
    meta: blob(),
  },
  table => [index('chat_idx').on(table.chat)],
);

export const ActionDbTweetUser = sqliteTable('TweetUser', {
  id: text().primaryKey().notNull(),
  createdAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  twitterId: text().notNull(),
});

export const ActionDbTerminalUser = sqliteTable('TerminalUser', {
  id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
  privyId: text('privy_id').notNull().unique(),
  meta: blob('meta'),
});

export const ActionDbTerminalChat = sqliteTable('TerminalChat', {
  id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
  createdAt: numeric('created_at')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  title: text('title').notNull(),
  userId: text('user')
    .notNull()
    .references(() => ActionDbTerminalUser.id, { onDelete: 'cascade' }),
  visibility: text('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export const ActionDbTerminalMessage = sqliteTable('TerminalMessage', {
  id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
  chatId: text('chat_id')
    .notNull()
    .references(() => ActionDbTerminalChat.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  parts: blob('parts').notNull(),
  createdAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});
