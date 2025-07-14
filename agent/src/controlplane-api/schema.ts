import { sql } from 'drizzle-orm';
import {
  blob,
  foreignKey,
  index,
  numeric,
  sqliteTable,
  text,
  unique,
} from 'drizzle-orm/sqlite-core';
import * as crypto from 'node:crypto';

export const ControlPlaneOrganization = sqliteTable('Organization', {
  id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  createdAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`)
    .notNull(),
  location: text().notNull(),
});

export const ControlPlaneOrganizationDb = sqliteTable(
  'OrganizationDatabase',
  {
    id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
    name: text().notNull(),
    hostname: text().notNull(),
    organization: text().notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    foreignKey({
      columns: [table.organization],
      foreignColumns: [ControlPlaneOrganization.id],
      name: 'organization_id_fk',
    }),
    unique('unique_name_organization').on(table.name, table.organization),
  ],
);

export const ControlPlanePrompt = sqliteTable(
  'Prompt',
  {
    id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
    key: text().notNull(),
    description: text(),
    organization: text()
      .notNull()
      .references(() => ControlPlaneOrganization.id),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP`)
      .notNull(),
    meta: blob(),
    latestCommitId: text().notNull(),
  },
  table => [
    unique('unique_key_organization').on(table.key, table.organization),
  ],
);

export const ControlPlanePromptCommit = sqliteTable(
  'PromptCommit',
  {
    id: text().primaryKey().$defaultFn(crypto.randomUUID).notNull(),
    promptId: text().notNull(),
    parentCommitId: text(),
    content: text().notNull(),
    message: text(),
    organization: text()
      .notNull()
      .references(() => ControlPlaneOrganization.id),
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
