import { manualKbDb } from 'database';
import { getKbDbInstance } from '../controlplane-api/utils';
import { logger } from '../logger';
import { CONTROL_PLANE_KB_SOURCE } from '../const';
import { slugify } from 'inngest';
import { generateEmbeddings, textSplitter } from '../twitter/helpers';
import { readFile } from 'node:fs/promises';
import pMap from 'p-map';
import path from 'node:path';

const log = logger.child({ module: 'ingest-kb' });

// Ideally we re-use the API call. Refactor later.
async function insertKB({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  const kbDbInstance = await getKbDbInstance({
    orgId: '',
    log,
  });

  const documentDbEntry = await kbDbInstance
    .insert(manualKbDb.ManualKbDocument)
    .values({
      id: crypto.randomUUID(),
      title,
      url: `/${CONTROL_PLANE_KB_SOURCE}/${slugify(title)}`,
      source: CONTROL_PLANE_KB_SOURCE,
      content: Buffer.from(content),
    })
    .returning({
      id: manualKbDb.ManualKbDocument.id,
    });
  const [result] = documentDbEntry;

  log.info({ document: result.id }, 'inserted manual kb document');

  const chunks = await textSplitter.splitText(`${title}: ${content}`);
  const embeddings = await generateEmbeddings(chunks);

  const data = chunks.map((value, index) => ({
    value,
    embedding: embeddings[index],
  }));

  const insertEmbeddings = await kbDbInstance
    .insert(manualKbDb.ManualKbDocumentVector)
    .values(
      data.map(({ value, embedding }) => ({
        id: crypto.randomUUID(),
        document: result.id,
        text: value,
        source: CONTROL_PLANE_KB_SOURCE,
        vector: embedding,
      })),
    )
    .execute();

  log.info(
    {
      count: insertEmbeddings.rows,
    },
    'inserted manual kb document vectors',
  );
}

export async function main() {
  // read the csv file
  const a = await readFile(path.join(__dirname, '..', 'kb.json'), {
    encoding: 'utf-8',
  });
  const json = JSON.parse(a);

  await pMap(
    json as Array<{ title: string; content: string }>,
    c =>
      insertKB({
        title: c.title,
        content: c.content,
      }),
    {
      concurrency: 5,
    },
  );
}

main().catch(console.error);
