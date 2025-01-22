import { asc, bill, count, db, desc } from 'database';
import { inngest } from '../ingest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const DATA = path.join(__dirname, '..', '..', 'data');

async function grabAllBillIdsFromDb() {
  const a = await db
    .select({
      id: bill.id,
    })
    .from(bill)
    .orderBy(asc(bill.id), asc(bill.createdAt));

  // write to file
  const data = JSON.stringify(a, null, 2);
  const file = path.join(DATA, 'bills.json');

  await fs.writeFile(file, data);
}

async function main() {
  // read the file
  const data = await fs.readFile(path.join(DATA, 'bills.json'), 'utf-8');
  const contents = JSON.parse(data);
  console.log(`Read ${contents.length} bills from file...`);

  // chunk arrays of 200
  const chunks = [];
  while (contents.length) {
    chunks.push(contents.splice(0, 200));
  }

  for await (const chunk of chunks) {
    const ing = await inngest.send(
      // @ts-expect-error - gotta type this better
      chunk.map(bill => ({
        name: 'bill.embed',
        id: `${bill.id}-take-3`,
        data: {
          id: bill.id,
        },
      })),
    );

    console.log(`Sent ${ing.ids.length} bills to Inngest.`);
  }
}

main().catch(console.error);
