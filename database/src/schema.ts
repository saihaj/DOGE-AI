import {
  sqliteTable,
  uniqueIndex,
  text,
  numeric,
  integer,
  blob,
  customType,
  index,
  foreignKey,
} from 'drizzle-orm/sqlite-core';
import * as crypto from 'node:crypto';
import { relations, sql } from 'drizzle-orm';
import { table } from 'node:console';

const float32Array = customType<{
  data: number[];
  config: { dimensions: number };
  configRequired: true;
  driverData: Buffer;
}>({
  dataType(config) {
    return `F32_BLOB(${config.dimensions})`;
  },
  fromDriver(value: Buffer) {
    return Array.from(new Float32Array(value.buffer));
  },
  toDriver(value: number[]) {
    return sql`vector32(${JSON.stringify(value)})`;
  },
});

export const bill = sqliteTable(
  'Bill',
  {
    id: text().primaryKey().notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    type: text().notNull(),
    number: integer().notNull(),
    congress: integer().notNull(),
    originChamber: text().notNull(),
    title: text().notNull(),
    url: text().notNull(),
    htmlVersionUrl: text().notNull(),
    pdfVersionUrl: text(),
    xmlVersionUrl: text(),
    content: blob().notNull(),
    summary: text().notNull(),
    impact: text().notNull(),
    funding: text().notNull(),
    spending: text().notNull(),
    introducedDate: text().notNull(),
    updateDate: text().notNull(),
    sponsorFirstName: text().notNull(),
    sponsorLastName: text().notNull(),
    sponsorParty: text().notNull(),
    sponsorInfoRaw: blob().notNull(),
  },
  table => [
    index('Bill_idx_number').on(table.number),
    index('Bill_idx_congress').on(table.congress),
    index('Bill_idx_type').on(table.type),
    uniqueIndex('Bill_congress_number_type_key').on(
      table.congress,
      table.number,
      table.type,
    ),
  ],
);

export const document = sqliteTable(
  'Document',
  {
    id: text().primaryKey().notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    title: text().notNull(),
    url: text().notNull(),
    meta: blob(),
    content: blob(),
    source: text(),
  },
  table => [index('Document_id_source_key').on(table.id, table.source)],
);

export const billVector = sqliteTable(
  'BillVector',
  {
    id: text().primaryKey().notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    bill: text().references(() => bill.id, { onDelete: 'cascade' }),
    document: text().references(() => document.id, { onDelete: 'cascade' }),
    vector: float32Array({ dimensions: 1536 }).notNull(),
    text: text().notNull(),
    source: text().notNull(),
  },
  table => [
    index('BillVector_vector_idx').on(table.id, table.vector),
    index('BillVector_source_idx').on(table.source),
    index('BillVector_bill_key').on(table.bill),
    index('BillVector_document_key').on(table.document),
  ],
);

export const prismaMigrations = sqliteTable('_prisma_migrations', {
  id: text().primaryKey().notNull(),
  checksum: text().notNull(),
  finishedAt: numeric('finished_at'),
  migrationName: text('migration_name').notNull(),
  logs: text(),
  rolledBackAt: numeric('rolled_back_at'),
  startedAt: numeric('started_at')
    .default(sql`(current_timestamp)`)
    .notNull(),
  appliedStepsCount: integer('applied_steps_count').default(0).notNull(),
});

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

export const messageVector = sqliteTable('MessageVector', {
  id: text().primaryKey().notNull(),
  createdAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  message: text()
    .notNull()
    .references(() => message.id, { onDelete: 'cascade' }),
  vector: float32Array({ dimensions: 1536 }).notNull(),
  text: text().notNull(),
});

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

export const drizzleMigrations = sqliteTable('__drizzle_migrations', {});

export const botConfig = sqliteTable('BotConfig', {
  id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
  createdAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`)
    .notNull(),
  key: text().notNull().unique(),
  value: text().notNull(),
});

export const prompt = sqliteTable('Prompt', {
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

export const promptCommit = sqliteTable(
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
    index('PromptCommit_prompt_id').on(table.promptId),
    foreignKey({
      columns: [table.parentCommitId],
      foreignColumns: [table.id],
      name: 'parent_commit_id_fk',
    }),
  ],
);

export const promptRelations = relations(prompt, ({ one }) => ({
  latestCommit: one(promptCommit, {
    fields: [prompt.latestCommitId],
    references: [promptCommit.id],
  }),
}));

export const promptCommitRelations = relations(promptCommit, ({ one }) => ({
  prompt: one(prompt, {
    fields: [promptCommit.promptId],
    references: [prompt.id],
  }),
}));
