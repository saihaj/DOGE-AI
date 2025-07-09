import { sql } from 'drizzle-orm';
import * as sqliteCore from 'drizzle-orm/sqlite-core';

const float32Array = sqliteCore.customType<{
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

export const ManualKbDocument = sqliteCore.sqliteTable(
  'Document',
  {
    id: sqliteCore.text().primaryKey().notNull(),
    createdAt: sqliteCore
      .numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: sqliteCore
      .numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    title: sqliteCore.text().notNull(),
    url: sqliteCore.text().notNull(),
    meta: sqliteCore.blob(),
    content: sqliteCore.blob(),
    source: sqliteCore.text(),
  },
  table => [sqliteCore.index('id_source_key').on(table.id, table.source)],
);

export const ManualKbDocumentVector = sqliteCore.sqliteTable(
  'DocumentVector',
  {
    id: sqliteCore.text().primaryKey().notNull(),
    createdAt: sqliteCore
      .numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: sqliteCore
      .numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    document: sqliteCore
      .text()
      .references(() => ManualKbDocument.id, {
        onDelete: 'cascade',
      })
      .notNull(),
    vector: float32Array({ dimensions: 1536 }).notNull(),
    text: sqliteCore.text().notNull(),
    source: sqliteCore.text().notNull(),
  },
  table => [
    sqliteCore.index('source_idx').on(table.source),
    sqliteCore.index('document_key').on(table.document),
  ],
);
