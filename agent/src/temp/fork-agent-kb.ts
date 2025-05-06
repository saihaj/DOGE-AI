import {
  db,
  eq,
  document as documentDbSchema,
  billVector,
  and,
} from 'database';
import { MANUAL_KB_AGENT_SOURCE, MANUAL_KB_CHAT_SOURCE } from '../const';
import { generateEmbeddings, textSplitter } from '../twitter/helpers';
import { slugify } from 'inngest';
import { logger } from '../logger';

const log = logger.child({
  module: 'fork-agent-kb',
});

async function main() {
  const _agentKbEntries = await db.query.document.findMany({
    where: eq(documentDbSchema.source, MANUAL_KB_AGENT_SOURCE),
    columns: {
      content: true,
      title: true,
    },
  });

  const agentKbEntries = _agentKbEntries.map(entry => ({
    ...entry,
    // @ts-expect-error ignore type
    content: Buffer.from(entry.content).toString(),
  }));

  if (agentKbEntries.length === 0) {
    log.error({}, 'no agent kb entries found');
    return;
  }

  log.info({ size: agentKbEntries.length }, 'found agent kb entries');

  for await (const entry of agentKbEntries) {
    const { content, title } = entry;

    const existingDocument = await db.query.document.findFirst({
      where: and(
        eq(documentDbSchema.url, `/${MANUAL_KB_CHAT_SOURCE}/${slugify(title)}`),
        eq(documentDbSchema.source, MANUAL_KB_CHAT_SOURCE),
      ),
      columns: {
        id: true,
      },
    });

    if (existingDocument) {
      log.info({ document: existingDocument.id }, 'document already exists');
      continue;
    }

    const documentDbEntry = await db
      .insert(documentDbSchema)
      .values({
        id: crypto.randomUUID(),
        title,
        url: `/${MANUAL_KB_CHAT_SOURCE}/${slugify(title)}`,
        source: MANUAL_KB_CHAT_SOURCE,
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
          source: MANUAL_KB_CHAT_SOURCE,
          vector: embedding,
        })),
      )
      .execute();

    log.info(
      { embeddings: insertEmbeddings.rowsAffected, document: result.id },
      'inserted embeddings for manual kb document',
    );
  }

  log.info({}, 'all agent kb entries processed');
  process.exit(0);
}

main().catch(console.error);
