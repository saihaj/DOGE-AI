import { sql, type InferSelectModel } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  primaryKey,
  foreignKey,
  numeric,
  integer,
  blob,
} from 'drizzle-orm/sqlite-core';
import * as crypto from 'node:crypto';

export const UserChatDb = sqliteTable('User', {
  id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
  privyId: text('privy_id').notNull().unique(),
  meta: blob('meta'),
});

export const ChatChatDb = sqliteTable('Chat', {
  id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
  createdAt: numeric('created_at')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  title: text('title').notNull(),
  userId: text('user')
    .notNull()
    .references(() => UserChatDb.id, { onDelete: 'cascade' }),
  visibility: text('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export const MessageChatDb = sqliteTable('Message', {
  id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
  chatId: text('chat_id')
    .notNull()
    .references(() => ChatChatDb.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  parts: blob('parts').notNull(),
  createdAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export const VoteChatDb = sqliteTable(
  'Vote',
  {
    chatId: text('chat')
      .notNull()
      .references(() => ChatChatDb.id, { onDelete: 'cascade' }),
    messageId: text('message')
      .notNull()
      .references(() => MessageChatDb.id, { onDelete: 'cascade' }),
    isUpvoted: integer('is_upvoted', { mode: 'boolean' }).notNull(),
    createdAt: numeric('created_at')
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);
