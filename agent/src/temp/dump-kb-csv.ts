import { manualKbDb } from 'database';
import { getKbDbInstance } from '../controlplane-api/utils';
import { logger } from '../logger';
import { json2csv } from 'json-2-csv';
import { writeFile } from 'node:fs/promises';

const log = logger.child({ module: 'dump-kb-csv' });

async function main() {
  // Provide empty orgId to connect to default kb database

  const dbInstance = await getKbDbInstance({
    orgId: '',
    log,
  });

  const content = await dbInstance
    .select({
      title: manualKbDb.ManualKbDocument.title,
      content: manualKbDb.ManualKbDocument.content,
    })
    .from(manualKbDb.ManualKbDocument)
    .orderBy(manualKbDb.ManualKbDocument.createdAt);

  const values = content.map(r => ({
    ...r,
    // @ts-expect-error ignore type
    content: Buffer.from(r.content).toString(),
  }));

  await writeFile('kb.json', JSON.stringify(values, null, 2), {
    encoding: 'utf-8',
  });

  await writeFile('kb.csv', json2csv(values), { encoding: 'utf-8' });
}

main().catch(console.error);
