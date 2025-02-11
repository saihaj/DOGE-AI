import { inngest } from './client';
import { embedMany } from 'ai';
import { NonRetriableError } from 'inngest';
import {
  db,
  bill as billDbSchema,
  eq,
  billVector as billVectorDbSchema,
  sql,
} from 'database';
import { cleanText, embeddingModel, textSplitter } from './helpers';

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
    throttle: {
      limit: 1000,
      period: '1h',
    },
    concurrency: 50,
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

    /**
     * The only reason one would trigger to re-embed is if the bill content has changed.
     * This is what makes the job idempotent.
     * We don't want to add infinite embeddings for the same bill.
     * So we remove the existing embeddings before adding new ones.
     */
    await step.run('remove-existing-embeddings', async () => {
      const result = await db
        .delete(billVectorDbSchema)
        .where(eq(billVectorDbSchema.bill, bill.id));

      console.log(
        `removed ${result.rowsAffected} existing embeddings for bill ${bill.id}`,
      );
    });

    const embeddingsForRaw = await step.run(
      'embeddings-for-bill-text',
      async () => {
        // @ts-expect-error - I know what I'm doing
        const content = Buffer.from(details.content).toString('utf-8');

        const values = await textSplitter.splitText(cleanText(content));

        const { embeddings } = await embedMany({
          model: embeddingModel,
          values,
        });

        const data = values.map((value, index) => ({
          value,
          embedding: embeddings[index],
        }));

        return db
          .insert(billVectorDbSchema)
          .values(
            data.map(({ value, embedding }) => ({
              source: 'raw' as const,
              bill: bill.id,
              text: value,
              vector: sql`vector32(${JSON.stringify(embedding)})`,
              id: crypto.randomUUID().toString(),
            })),
          )
          .returning({ id: billVectorDbSchema.id });
      },
    );

    const embeddingsForSummary = await step.run(
      'embeddings-for-summary',
      async () => {
        const values = await textSplitter.splitText(details.summary);

        const { embeddings } = await embedMany({
          model: embeddingModel,
          values,
        });

        const data = values.map((value, index) => ({
          value,
          embedding: embeddings[index],
        }));

        return db
          .insert(billVectorDbSchema)
          .values(
            data.map(({ value, embedding }) => ({
              source: 'summary' as const,
              bill: bill.id,
              text: value,
              vector: sql`vector32(${JSON.stringify(embedding)})`,
              id: crypto.randomUUID().toString(),
            })),
          )
          .returning({ id: billVectorDbSchema.id });
      },
    );

    const embeddingsForImpact = await step.run(
      'embeddings-for-impact',
      async () => {
        const values = await textSplitter.splitText(details.impact);

        const { embeddings } = await embedMany({
          model: embeddingModel,
          values,
        });

        const data = values.map((value, index) => ({
          value,
          embedding: embeddings[index],
        }));

        return db
          .insert(billVectorDbSchema)
          .values(
            data.map(({ value, embedding }) => ({
              source: 'impact' as const,
              bill: bill.id,
              text: value,
              vector: sql`vector32(${JSON.stringify(embedding)})`,
              id: crypto.randomUUID().toString(),
            })),
          )
          .returning({ id: billVectorDbSchema.id });
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
          model: embeddingModel,
          values,
        });

        const data = values.map((value, index) => ({
          value,
          embedding: embeddings[index],
        }));

        return db
          .insert(billVectorDbSchema)
          .values(
            data.map(({ value, embedding }) => ({
              source: 'funding' as const,
              bill: bill.id,
              text: value,
              vector: sql`vector32(${JSON.stringify(embedding)})`,
              id: crypto.randomUUID().toString(),
            })),
          )
          .returning({ id: billVectorDbSchema.id });
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
          model: embeddingModel,
          values,
        });

        const data = values.map((value, index) => ({
          value,
          embedding: embeddings[index],
        }));

        return db
          .insert(billVectorDbSchema)
          .values(
            data.map(({ value, embedding }) => ({
              source: 'spending' as const,
              bill: bill.id,
              text: value,
              vector: sql`vector32(${JSON.stringify(embedding)})`,
              id: crypto.randomUUID().toString(),
            })),
          )
          .returning({ id: billVectorDbSchema.id });
      },
    );

    return {
      bill: bill.id,
      inserted:
        embeddingsForFunding.length +
        embeddingsForImpact.length +
        embeddingsForRaw.length +
        embeddingsForSpending.length +
        embeddingsForSummary.length,
    };
  },
);
