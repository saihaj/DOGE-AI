import { inngest } from '../ingest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const DATA = path.join(__dirname, '..', '..', 'data');

async function main() {
  // list all files
  const files = await fs.readdir(DATA);

  const allDataFiles = files.filter(file => file.startsWith('bill-'));

  // load a file, iterate over contents and send to Inngest
  for await (const file of allDataFiles) {
    const data = await fs.readFile(path.join(DATA, file), 'utf-8');
    const contents = JSON.parse(data);

    console.log(`Sending ${contents.bills.length} bills to Inngest...`);

    const ing = await inngest.send(
      // @ts-expect-error - gotta type this better
      contents.bills.map(bill => ({
        name: 'bill.imported',
        id: `${bill.congress}-${bill.originChamberCode.toLowerCase()}-${bill.number}`,
        data: bill,
      })),
    );

    console.log(`Sent ${ing.ids.length} bills to Inngest.`);
  }
}

main().catch(console.error);
