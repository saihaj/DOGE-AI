import { HEADERS } from '../const';
import { inngest } from './client';
import { NonRetriableError } from 'inngest';
import contentTypeParser from 'fast-content-type-parse';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import sanitize from 'sanitize-html';
import { embeddingModel, textSplitter } from './helpers';
import { embedMany } from 'ai';
import * as crypto from 'node:crypto';
import { billVector, db, document as documentDbSchema } from 'database';

async function getContentType(url: string) {
  // Use HEAD request for efficiency
  const response = await fetch(url, { method: 'HEAD', headers: HEADERS });
  return response.headers.get('content-type');
}

export const processDocument = inngest.createFunction(
  {
    id: 'process-document',
    // this will ensure our processing rate is 2000/hour
    throttle: {
      limit: 2000,
      period: '1h',
    },
    concurrency: 100,
  },
  { event: 'document.imported' },
  async ({ event, step }) => {
    const document = event.data;

    const contentType = await getContentType(document.url);

    if (!contentType) {
      throw new NonRetriableError(
        `Content type for ${document.url} is not available`,
      );
    }
    const parsedContentType = contentTypeParser.parse(contentType);

    if (parsedContentType.type !== 'application/pdf') {
      throw new NonRetriableError(
        `Content type for ${document.url} is not a PDF`,
      );
    }

    const req = await fetch(document.url, {
      headers: HEADERS,
    });
    const pdfBuffer = await req.blob();
    const loader = new PDFLoader(pdfBuffer);

    const docs = await loader.load();
    const docContent = docs
      .map(doc => {
        return sanitize(doc.pageContent, {
          allowedTags: [],
        })
          .toLowerCase()
          .replace(/[\n\t\r\b\f\u200B]/g, '') // Remove whitespace-related and invisible characters
          .replace(/[^\x20-\x7E]/g, '') // Remove non-printable ASCII characters
          .replace(/<[^>]*>/g, '') // Remove HTML tags (optional)
          .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
          .trim();
      })
      .join('\n\n\n\n\n');

    const chunks = await textSplitter.splitText(docContent);

    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: chunks,
    });

    const data = chunks.map((value, index) => ({
      value,
      embedding: embeddings[index],
    }));

    const docDB = await db
      .insert(documentDbSchema)
      .values({
        id: crypto.randomUUID(),
        title: document.title,
        url: document.url,
      })
      .returning({
        id: documentDbSchema.id,
      });

    const dbDocId = docDB[0].id;

    const insertEmbeddings = await db
      .insert(billVector)
      .values(
        data.map(({ value, embedding }) => ({
          id: crypto.randomUUID(),
          document: dbDocId,
          text: value,
          source: 'raw' as const,
          vector: embedding,
        })),
      )
      .execute();

    return {
      document: dbDocId,
      embeddings: insertEmbeddings.rowsAffected,
    };
  },
);
