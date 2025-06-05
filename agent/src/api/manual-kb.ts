import {
  and,
  asc,
  billVector,
  db,
  document as documentDbSchema,
  eq,
  gt,
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
import { logger } from '../logger';
import {
  MANUAL_KB_AGENT_SOURCE,
  MANUAL_KB_CHAT_SOURCE,
  VECTOR_SEARCH_MATCH_THRESHOLD,
} from '../const';
import z from 'zod';
import { protectedProcedure } from '../trpc';

export const createKbEntry = protectedProcedure
  .input(
    z.object({
      title: z.string(),
      type: z.enum(['agent', 'chat', 'custom1']),
      content: z.string(),
    }),
  )
  .mutation(async opts => {
    const { title, content, type } = opts.input;
    const log = logger.child({
      function: 'createKbEntry',
      requestId: opts.ctx.requestId,
      type,
    });

    const source = (() => {
      switch (type) {
        case 'agent':
          return MANUAL_KB_AGENT_SOURCE;
        case 'chat':
          return MANUAL_KB_CHAT_SOURCE;
        case 'custom1':
          return `manual-kb-${type}` as const;
        default:
          throw new Error('Invalid type');
      }
    })();

    const documentDbEntry = await db
      .insert(documentDbSchema)
      .values({
        id: crypto.randomUUID(),
        title,
        url: `/${source}/${slugify(title)}`,
        source,
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
          source,
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
  });

export const editKbEntry = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      content: z.string(),
      type: z.enum(['agent', 'chat', 'custom1']),
    }),
  )
  .mutation(async opts => {
    const { id, title, content, type } = opts.input;
    const log = logger.child({
      function: 'editKbEntry',
      requestId: opts.ctx.requestId,
      document: id,
      type,
    });

    const source = (() => {
      switch (type) {
        case 'agent':
          return MANUAL_KB_AGENT_SOURCE;
        case 'chat':
          return MANUAL_KB_CHAT_SOURCE;
        case 'custom1':
          return `manual-kb-${type}` as const;
        default:
          throw new Error('Invalid type');
      }
    })();

    // search for the document
    const doc = await db.query.document.findFirst({
      where: and(
        eq(documentDbSchema.id, id),
        eq(documentDbSchema.source, source),
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
          source,
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
  });

export const getKbEntries = protectedProcedure
  .input(
    z.object({
      cursor: z.string().optional(),
      limit: z.number(),
      type: z.enum(['agent', 'chat', 'custom1']),
      query: z.string().optional(),
    }),
  )
  .query(async opts => {
    const { limit, cursor, query, type } = opts.input;

    const source = (() => {
      switch (type) {
        case 'agent':
          return MANUAL_KB_AGENT_SOURCE;
        case 'chat':
          return MANUAL_KB_CHAT_SOURCE;
        case 'custom1':
          return `manual-kb-${type}` as const;
        default:
          throw new Error('Invalid type');
      }
    })();

    if (!query) {
      const documents = await db.query.document.findMany({
        where: and(
          eq(documentDbSchema.source, source),
          cursor ? gt(documentDbSchema.createdAt, cursor) : undefined,
        ),
        orderBy: (documents, { asc }) => asc(documents.createdAt),
        limit: limit + 1,
        columns: {
          id: true,
          content: true,
          title: true,
          createdAt: true,
        },
      });

      // Process the results
      const hasNext = documents.length > limit;
      if (hasNext) documents.pop(); // Remove the extra item

      const nextCursor =
        documents.length > 0 ? documents[documents.length - 1].createdAt : null;

      return {
        items: documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          // @ts-expect-error ignore type
          content: Buffer.from(doc.content).toString(),
        })),
        nextCursor: hasNext ? nextCursor : null,
        query: null,
      };
    }

    const termEmbedding = await generateEmbedding(query.trim());
    const termEmbeddingString = JSON.stringify(termEmbedding);

    const documents = await db
      .select({
        id: documentDbSchema.id,
        title: documentDbSchema.title,
        content: documentDbSchema.content,
        createdAt: documentDbSchema.createdAt,
      })
      .from(billVector)
      .where(
        and(
          sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString})) < ${VECTOR_SEARCH_MATCH_THRESHOLD}`,
          isNotNull(billVector.document),
          eq(billVector.source, source),
          cursor ? gt(documentDbSchema.createdAt, cursor) : undefined,
        ),
      )
      .orderBy(
        sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString})) ASC`,
        asc(documentDbSchema.createdAt),
      )
      .groupBy(billVector.document)
      .leftJoin(documentDbSchema, eq(documentDbSchema.id, billVector.document))
      .limit(limit + 1);

    // Process the results
    const hasNext = documents.length > limit;
    if (hasNext) documents.pop(); // Remove the extra item

    const nextCursor =
      documents.length > 0 ? documents[documents.length - 1].createdAt : null;

    return {
      items: documents.map(doc => ({
        id: doc.id!,
        title: doc.title!,
        // @ts-expect-error ignore type
        content: Buffer.from(doc.content).toString(),
      })),
      nextCursor: hasNext ? nextCursor : null,
      query,
    };
  });

export const deleteKbEntry = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      type: z.enum(['agent', 'chat', 'custom1']),
    }),
  )
  .mutation(async opts => {
    const { id, type } = opts.input;

    const source = (() => {
      switch (type) {
        case 'agent':
          return MANUAL_KB_AGENT_SOURCE;
        case 'chat':
          return MANUAL_KB_CHAT_SOURCE;
        case 'custom1':
          return `manual-kb-${type}` as const;
        default:
          throw new Error('Invalid type');
      }
    })();

    const log = logger.child({
      function: 'deleteKbEntry',
      requestId: opts.ctx.requestId,
      document: id,
      source,
    });

    log.info({}, 'deleting manual kb document');
    const documents = await db
      .delete(documentDbSchema)
      .where(
        and(eq(documentDbSchema.id, id), eq(documentDbSchema.source, source)),
      )
      .execute();

    log.info(
      { documents: documents.rowsAffected },
      'deleted manual kb document',
    );

    return {
      rowsAffected: documents.rowsAffected,
    };
  });
