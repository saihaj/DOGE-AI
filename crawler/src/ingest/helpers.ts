import { openai } from '@ai-sdk/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { db, eq, document as documentDbSchema } from 'database';
import he from 'he';
import sanitize from 'sanitize-html';

// Recommendations from ChatGPT
const CHUNK_SIZE = 2048;
const CHUNK_OVERLAP = 24;

export const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

export function cleanText(html: string) {
  const decoded = he.decode(html); // Convert &lt; and &gt; to < and >
  const text = sanitize(decoded, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return text.replace(/\s+/g, ' ').trim();
}

export const embeddingModel = openai.textEmbeddingModel(
  'text-embedding-3-small',
);

export async function upsertDocument({
  title,
  url,
  source,
  content,
}: {
  title: string;
  url: string;
  source: 'web' | 'pdf';
  content?: string;
}) {
  const doc = await db.query.document.findFirst({
    where: eq(documentDbSchema.url, url),
    columns: {
      id: true,
    },
  });

  if (doc) {
    // Update the document with the new content
    if (content) {
      await db
        .update(documentDbSchema)
        .set({
          content: Buffer.from(content),
        })
        .where(eq(documentDbSchema.id, doc.id))
        .execute();
    }

    return doc;
  }

  const created = await db
    .insert(documentDbSchema)
    .values({
      id: crypto.randomUUID(),
      title,
      url,
      source,
      content: content ? Buffer.from(content) : undefined,
    })
    .returning({
      id: documentDbSchema.id,
    });

  const [result] = created;
  return result;
}
