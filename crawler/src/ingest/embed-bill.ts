import { inngest } from './client';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { NonRetriableError } from 'inngest';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import {
  db,
  bill as billDbSchema,
  eq,
  billVector as billVectorDbSchema,
  sql,
} from 'database';
import sanitize from 'sanitize-html';
import he from 'he';

// Recommendations from ChatGPT
const CHUNK_SIZE = 2048;
const CHUNK_OVERLAP = 24;

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

function cleanText(html: string) {
  const decoded = he.decode(html); // Convert &lt; and &gt; to < and >
  const text = sanitize(decoded, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return text.replace(/\s+/g, ' ').trim();
}

const model = openai.textEmbeddingModel('text-embedding-3-small');

function canIgnoreAnalysis(text: string) {
  return (
    text === 'NOT_SPECIFIED' ||
    text === 'NO_FUNDING_ALLOCATED' ||
    text === 'NO_FUNDING_ALLOCATED.'
  );
}
export const embedBill = inngest.createFunction(
  {
    id: 'embed-bill',
    // this will ensure our processing rate is 5000/hour
    throttle: {
      limit: 5000,
      period: '1h',
    },
  },
  { event: 'bill.embed' },
  async ({ event, step }) => {
    const bill = event.data;

    const details = await db.query.bill.findFirst({
      where: eq(billDbSchema.id, bill.id),
    });

    if (!details) {
      throw new NonRetriableError(`Bill ${bill.id} not found`);
    }

    const embeddingsForRaw = await step.run(
      'embeddings-for-bill-text',
      async () => {
        // @ts-expect-error - I know what I'm doing
        const content = Buffer.from(details.content).toString('utf-8');

        const values = await textSplitter.splitText(cleanText(content));

        const { embeddings } = await embedMany({
          model,
          values,
        });

        return values.map((value, index) => ({
          value,
          embedding: embeddings[index],
        }));
      },
    );

    const embeddingsForSummary = await step.run(
      'embeddings-for-summary',
      async () => {
        const values = await textSplitter.splitText(details.summary);

        const { embeddings } = await embedMany({
          model,
          values,
        });

        return values.map((value, index) => ({
          value,
          embedding: embeddings[index],
        }));
      },
    );

    const embeddingsForImpact = await step.run(
      'embeddings-for-impact',
      async () => {
        const values = await textSplitter.splitText(details.impact);

        const { embeddings } = await embedMany({
          model,
          values,
        });

        return values.map((value, index) => ({
          value,
          embedding: embeddings[index],
        }));
      },
    );

    const embeddingsForFunding = await step.run(
      'embeddings-for-funding',
      async () => {
        if (canIgnoreAnalysis(details.funding)) {
          return [];
        }

        const values = await textSplitter.splitText(details.funding);

        const { embeddings } = await embedMany({
          model,
          values,
        });

        return values.map((value, index) => ({
          value,
          embedding: embeddings[index],
        }));
      },
    );

    const embeddingsForSpending = await step.run(
      'embeddings-for-spending',
      async () => {
        if (canIgnoreAnalysis(details.spending)) {
          return [];
        }
        const values = await textSplitter.splitText(details.spending);

        const { embeddings } = await embedMany({
          model,
          values,
        });

        return values.map((value, index) => ({
          value,
          embedding: embeddings[index],
        }));
      },
    );

    const storeInDb = await step.run('store-in-db', async () => {
      return db
        .insert(billVectorDbSchema)
        .values([
          ...embeddingsForRaw.map(({ value, embedding }) => ({
            source: 'raw' as const,
            bill: bill.id,
            text: value,
            vector: sql`vector32(${JSON.stringify(embedding)})`,
            id: crypto.randomUUID().toString(),
          })),
          ...embeddingsForSummary.map(({ value, embedding }) => ({
            source: 'summary' as const,
            bill: bill.id,
            text: value,
            vector: sql`vector32(${JSON.stringify(embedding)})`,
            id: crypto.randomUUID().toString(),
          })),
          ...embeddingsForFunding.map(({ value, embedding }) => ({
            source: 'funding' as const,
            bill: bill.id,
            text: value,
            vector: sql`vector32(${JSON.stringify(embedding)})`,
            id: crypto.randomUUID().toString(),
          })),
          ...embeddingsForImpact.map(({ value, embedding }) => ({
            source: 'impact' as const,
            bill: bill.id,
            text: value,
            vector: sql`vector32(${JSON.stringify(embedding)})`,
            id: crypto.randomUUID().toString(),
          })),
          ...embeddingsForSpending.map(({ value, embedding }) => ({
            source: 'spending' as const,
            bill: bill.id,
            text: value,
            vector: sql`vector32(${JSON.stringify(embedding)})`,
            id: crypto.randomUUID().toString(),
          })),
        ])
        .returning({ id: billVectorDbSchema.id });
    });

    return {
      bill: bill.id,
      inserted: storeInDb.length,
    };
  },
);
