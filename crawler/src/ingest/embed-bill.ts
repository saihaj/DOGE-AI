import { embedMany } from 'ai';
import {
  bill as billDbSchema,
  billVector as billVectorDbSchema,
  db,
  eq,
  sql,
} from 'database';
import { NonRetriableError } from 'inngest';
import { inngest } from './client';
import { cleanText, embeddingModel, textSplitter } from './helpers';

export const embedBill = inngest.createFunction(
  {
    id: 'embed-bill',
    throttle: {
      limit: 800,
      period: '1h',
    },
    concurrency: 20,
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

    return {
      bill: bill.id,
      inserted: embeddingsForRaw.length,
    };
  },
);
