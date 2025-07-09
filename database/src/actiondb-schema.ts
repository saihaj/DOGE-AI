import { sql } from 'drizzle-orm';
import {
  blob,
  index,
  numeric,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export const chat = sqliteTable(
  'Chat',
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
      .references(() => user.id, { onDelete: 'cascade' }),
    tweetId: text(),
  },
  table => [index('Chat_tweet_id').on(table.tweetId)],
);

export const message = sqliteTable(
  'Message',
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
      .references(() => chat.id, { onDelete: 'cascade' }),
    text: text().notNull(),
    tweetId: text(),
    meta: blob(),
  },
  table => [index('Message_chat_id').on(table.chat)],
);

export const user = sqliteTable('User', {
  id: text().primaryKey().notNull(),
  createdAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  twitterId: text().notNull(),
});
