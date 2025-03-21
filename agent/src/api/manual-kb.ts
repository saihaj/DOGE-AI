import { Static, Type } from '@sinclair/typebox';
import {
  and,
  asc,
  billVector,
  db,
  document as documentDbSchema,
  eq,
  isNotNull,
  sql,
} from 'database';
import * as crypto from 'node:crypto';
import { slugify } from 'inngest';
import {
  generateEmbedding,
  generateEmbeddings,
  textSplitter,
} from '../twitter/helpers';
import { WithLogger } from '../logger';
import { MANUAL_KB_SOURCE, VECTOR_SEARCH_MATCH_THRESHOLD } from '../const';

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

export const ManualKBPatchInput = Type.Object({
  title: Type.String(),
  content: Type.String(),
  id: Type.String(),
});
export type ManualKBPatchInput = Static<typeof ManualKBPatchInput>;

export async function patchKbInsert(
  { title, content, id }: ManualKBPatchInput,
  logger: WithLogger,
): Promise<{
  id: string;
}> {
  const log = logger.child({
    module: 'patchKbInsert',
    document: id,
  });

  // search for the document
  const doc = await db.query.document.findFirst({
    where: and(
      eq(documentDbSchema.id, id),
      eq(documentDbSchema.source, MANUAL_KB_SOURCE),
    ),
    columns: {
      id: true,
    },
  });

  if (!doc) {
    log.error({}, 'document not found');
    throw new Error('Document not found');
  }

  // remove old embeddings
  log.info({}, 'removing old vector embeddings');
  const removeOldEmbeddings = await db
    .delete(billVector)
    .where(eq(billVector.document, doc.id))
    .execute();
  log.info(
    { count: removeOldEmbeddings.rowsAffected },
    'removed old vector embeddings',
  );

  // update existing document
  log.info({}, 'updating document');
  const doucumentUpdate = await db
    .update(documentDbSchema)
    .set({
      title,
      content: Buffer.from(content),
    })
    .where(eq(documentDbSchema.id, doc.id))
    .execute();
  log.info({ count: doucumentUpdate.rowsAffected }, 'updated document');

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
        document: doc.id,
        text: value,
        source: MANUAL_KB_SOURCE,
        vector: embedding,
      })),
    )
    .execute();

  log.info(
    { count: insertEmbeddings.rowsAffected },
    'inserted embeddings for manual kb document',
  );

  return {
    id,
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

export const ManualKbSearchInput = Type.Object({
  page: Type.Number(),
  limit: Type.Number(),
  query: Type.String(),
});
export type ManualKbSearchInput = Static<typeof ManualKbSearchInput>;

export async function getKbSearchEntries({
  page,
  limit,
  query,
}: ManualKbSearchInput) {
  const termEmbedding = await generateEmbedding(query.trim());
  const termEmbeddingString = JSON.stringify(termEmbedding);

  const documents = await db
    .select({
      id: documentDbSchema.id,
      title: documentDbSchema.title,
      content: documentDbSchema.content,
    })
    .from(billVector)
    .where(
      and(
        sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString})) < ${VECTOR_SEARCH_MATCH_THRESHOLD}`,
        isNotNull(billVector.document),
        eq(billVector.source, MANUAL_KB_SOURCE),
      ),
    )
    .orderBy(
      sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString})) ASC`,
    )
    .groupBy(billVector.document)
    .leftJoin(documentDbSchema, eq(documentDbSchema.id, billVector.document))
    .limit(limit)
    .offset((page - 1) * limit);

  return documents;
}
