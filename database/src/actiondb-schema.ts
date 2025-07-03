import { sql } from 'drizzle-orm';
import {
  blob,
  foreignKey,
  index,
  numeric,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import * as crypto from 'node:crypto';

export const ActionDbPromptTable = sqliteTable('Prompt', {
  id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
  key: text().notNull().unique(),
  description: text(),
  createdAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`)
    .notNull(),
  meta: blob(),
  latestCommitId: text().notNull(),
});

export const ActionDbPromptCommitTable = sqliteTable(
  'PromptCommit',
  {
    id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
    promptId: text().notNull(),
    parentCommitId: text(),
    content: text().notNull(),
    message: text(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP`)
      .notNull(),
    meta: blob(),
  },
  table => [
    index('prompt_idx').on(table.promptId),
    foreignKey({
      columns: [table.promptId],
      foreignColumns: [ActionDbPromptTable.id],
      name: 'prompt_id_fk',
    }),
    foreignKey({
      columns: [table.parentCommitId],
      foreignColumns: [table.id],
      name: 'parent_commit_fk',
    }),
  ],
);

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
