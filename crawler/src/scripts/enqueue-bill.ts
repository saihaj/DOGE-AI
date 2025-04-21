import { inngest } from '../ingest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { differenceInDays } from 'date-fns';

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
    // We look at bills that have changed in the last 8 days since we are running this each week
    const todayDate = new Date();

    // @ts-expect-error - gotta type this better
    const filteredBills = contents.bills.filter(bill => {
      const updateDateIncludingText = new Date(bill.updateDateIncludingText);
      const diff = differenceInDays(todayDate, updateDateIncludingText);
      return diff <= 8;
    });

    console.log(`Filtered ${filteredBills.length} bills to send to Inngest...`);

    const ing = await inngest.send(
      // @ts-expect-error - gotta type this better
      filteredBills.map(bill => ({
        name: 'bill.imported',
        id: `${bill.congress}-${bill.originChamberCode.toLowerCase()}-${bill.number}`,
        data: bill,
      })),
    );

    console.log(`Sent ${ing.ids.length} bills to Inngest.`);
  }
}

main().catch(console.error);
