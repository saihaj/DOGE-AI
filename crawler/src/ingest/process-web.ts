import { FC_API_KEY } from '../const';
import { inngest } from './client';
import { NonRetriableError } from 'inngest';
import sanitize from 'sanitize-html';
import { embeddingModel, textSplitter, upsertDocument } from './helpers';
import { embedMany } from 'ai';
import * as crypto from 'node:crypto';
import { billVector, db, eq } from 'database';
import FirecrawlApp from '@mendable/firecrawl-js';
import { Document } from 'langchain/document';

const app = new FirecrawlApp({ apiKey: FC_API_KEY });

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const processWebpage = inngest.createFunction(
  {
    id: 'process-webpage',
    throttle: {
      limit: 1000,
      period: '1h',
    },
    concurrency: 100,
  },
  { event: 'web.imported' },
  async ({ event, step }) => {
    const url = event.data.url;
    const actions = event.data.actions;

    if (!isValidUrl(url)) {
      throw new NonRetriableError('Invalid URL');
    }

    const crawlResponse = await app
      .scrapeUrl(url, {
        formats: ['markdown'],
        actions: actions,
      })
      .catch(e => {
        throw new NonRetriableError(e.message);
      });

    if (!crawlResponse.success) {
      throw new NonRetriableError(`Failed to crawl: ${crawlResponse.error}`);
    }

    const markdown = crawlResponse.markdown;
    if (!markdown) {
      throw new NonRetriableError('No markdown content found');
    }

    const title = crawlResponse.metadata?.title;
    if (!title) {
      throw new NonRetriableError('No title found');
    }

    const doc = new Document({
      pageContent: markdown,
      metadata: {
        source: url,
        title,
      },
    });

    const docContent = sanitize(doc.pageContent, {
      allowedTags: [],
    })
      .toLowerCase()
      .replace(/[\n\t\r\b\f\u200B]/g, '') // Remove whitespace-related and invisible characters
      .replace(/[^\x20-\x7E]/g, '') // Remove non-printable ASCII characters
      .replace(/<[^>]*>/g, '') // Remove HTML tags (optional)
      .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
      .trim();

    const chunks = await textSplitter.splitText(docContent);

    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: chunks,
    });

    const data = chunks.map((value, index) => ({
      value,
      embedding: embeddings[index],
    }));

    const docDB = await upsertDocument({
      title,
      url,
      source: 'web',
      content: doc.pageContent,
    });

    /**
     * The only reason one would trigger to re-embed is if the bill content has changed.
     * This is what makes the job idempotent.
     * We don't want to add infinite embeddings for the same document.
     * So we remove the existing embeddings before adding new ones.
     */
    await step.run('remove-existing-embeddings', async () => {
      const result = await db
        .delete(billVector)
        .where(eq(billVector.document, docDB.id));

      console.log(
        `removed ${result.rowsAffected} existing embeddings for document ${docDB.id}`,
      );
    });

    const insertEmbeddings = await step.run('insert-embeddings', async () => {
      return db
        .insert(billVector)
        .values(
          data.map(({ value, embedding }) => ({
            id: crypto.randomUUID(),
            document: docDB.id,
            text: value,
            source: 'web' as const,
            vector: embedding,
          })),
        )
        .execute();
    });

    return {
      document: docDB.id,
      embeddings: insertEmbeddings.rowsAffected,
    };
  },
);
