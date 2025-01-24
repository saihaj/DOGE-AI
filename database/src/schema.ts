import {
  sqliteTable,
  text,
  numeric,
  integer,
  uniqueIndex,
  blob,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { customType } from 'drizzle-orm/sqlite-core';

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

export const bill = sqliteTable(
  'Bill',
  {
    id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP`)
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
    uniqueIndex('Bill_congress_number_type_key').on(
      table.congress,
      table.number,
      table.type,
    ),
  ],
);

export const billVector = sqliteTable('BillVector', {
  id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
  createdAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`)
    .notNull(),
  bill: text()
    .notNull()
    .references(() => bill.id, { onDelete: 'cascade' }),
  vector: float32Array('vector', { dimensions: 1536 }),
  text: text().notNull(), // the chunk that we are embedding
  source: text({
    enum: ['raw', 'summary', 'impact', 'funding', 'spending'],
  }).notNull(),
});

export const user = sqliteTable('User', {
  id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
  createdAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`)
    .notNull(),
  twitterId: text().notNull(),
});

export const chat = sqliteTable('Chat', {
  id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
  createdAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`)
    .notNull(),
  user: text()
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  /**
   * This would be tweetId for the reply user has made.
   * Essential the first tweet that started conversation with the bot
   */
  tweetId: text().unique(),
});

export const message = sqliteTable('Message', {
  id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
  createdAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`)
    .notNull(),
  role: text({ enum: ['user', 'assistant'] }).notNull(),
  chat: text()
    .notNull()
    .references(() => chat.id, { onDelete: 'cascade' }),
  text: text().notNull(),
  vector: float32Array('vector', { dimensions: 1536 }),
  tweetId: text(),
});
