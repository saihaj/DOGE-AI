import { Static, Type } from '@sinclair/typebox';
import {
  and,
  asc,
  billVector,
  db,
  document as documentDbSchema,
  eq,
} from 'database';
import * as crypto from 'node:crypto';
import { slugify } from 'inngest';
import { generateEmbeddings, textSplitter } from '../twitter/helpers';
import { WithLogger } from '../logger';
import { MANUAL_KB_SOURCE } from '../const';

export const ManualKBInsertInput = Type.Object({
  title: Type.String(),
  content: Type.String(),
});
export type ManualKBInsertInput = Static<typeof ManualKBInsertInput>;

export async function postKbInsert(
  { title, content }: ManualKBInsertInput,
  logger: WithLogger,
): Promise<{
  id: string;
}> {
  const log = logger.child({
    module: 'postKbInsert',
  });

  const documentDbEntry = await db
    .insert(documentDbSchema)
    .values({
      id: crypto.randomUUID(),
      title,
      url: `/manual-kb/${slugify(title)}`,
      source: MANUAL_KB_SOURCE,
      content: Buffer.from(content),
    })
    .returning({
      id: documentDbSchema.id,
    });
  const [result] = documentDbEntry;

  log.info({ document: result.id }, 'inserted manual kb document');

  const chunks = await textSplitter.splitText(`${title}: ${content}`);
  const embeddings = await generateEmbeddings(chunks);

  const data = chunks.map((value, index) => ({
    value,
    embedding: embeddings[index],
  }));

  const insertEmbeddings = await db
    .insert(billVector)
    .values(
      data.map(({ value, embedding }) => ({
        id: crypto.randomUUID(),
        document: result.id,
        text: value,
        source: MANUAL_KB_SOURCE,
        vector: embedding,
      })),
    )
    .execute();

  log.info(
    { embeddings: insertEmbeddings.rowsAffected, document: result.id },
    'inserted embeddings for manual kb document',
  );

  return {
    id: result.id,
  };
}

export const ManualKbGetInput = Type.Object({
  page: Type.Number(),
  limit: Type.Number(),
});
export type ManualKbGetInput = Static<typeof ManualKbGetInput>;

export async function getKbEntries({ page, limit }: ManualKbGetInput) {
  const documents = await db.query.document.findMany({
    where: eq(documentDbSchema.source, MANUAL_KB_SOURCE),
    orderBy: (documents, { asc }) => asc(documents.createdAt),
    limit,
    offset: (page - 1) * limit,
    columns: {
      id: true,
      content: true,
      title: true,
    },
  });

  return documents;
}

export const ManualKbDeleteInput = Type.Object({
  id: Type.String(),
});
export type ManualKbDeleteInput = Static<typeof ManualKbDeleteInput>;

export async function deleteManualKbEntry(
  { id }: ManualKbDeleteInput,
  logger: WithLogger,
) {
  const log = logger.child({
    module: 'deleteManualKbEntry',
  });

  log.info({ document: id }, 'deleting manual kb document');
  const documents = await db
    .delete(documentDbSchema)
    .where(
      and(
        eq(documentDbSchema.id, id),
        eq(documentDbSchema.source, MANUAL_KB_SOURCE),
      ),
    )
    .execute();

  log.info({ documents: documents.rowsAffected }, 'deleted manual kb document');

  return documents;
}
