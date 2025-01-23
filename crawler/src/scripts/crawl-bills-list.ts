import fs from 'node:fs/promises';
import {
  API_BASE_URL,
  API_KEY,
  API_VERSION,
  BILL_CONGRESS,
  HEADERS,
} from '../const.js';

const BILL_ENDPOINT = `${API_BASE_URL}/${API_VERSION}/bill`;
const BILL_TYPE = 's';
const API_URL = `${BILL_ENDPOINT}/${BILL_CONGRESS}/${BILL_TYPE}`;
const DATA_DIR = 'data';
const DATA_FILE = 'bill';

function fetchBills({ offset = 0, limit = 20 }) {
  const searchParams = new URLSearchParams();

  searchParams.set('api_key', API_KEY);
  searchParams.set('offset', offset.toString());
  searchParams.set('limit', limit.toString());
  searchParams.set('format', 'json');

  const url = `${API_URL}?${searchParams.toString()}`;

  return fetch(url, {
    method: 'GET',
    headers: HEADERS,
  });
}

/**
 * Fetch the different bills from the Senate and save them in a JSON file for further processing
 */
async function main() {
  // create a data directory if it doesn't exist
  // if we already have the directory, we don't need to create it
  try {
    await fs.access(DATA_DIR);
  } catch (error) {
    // @ts-expect-error haven't put in effort to type this
    if (error.code === 'ENOENT') {
      await fs.mkdir(DATA_DIR);
    } else {
      throw error;
    }
  }

  let offset = 0;

  while (true) {
    const response = await fetchBills({ offset, limit: 250 });
    if (!response.ok) {
      throw new Error(`Failed to fetch bills: ${response.statusText}`);
    }

    const json = await response.json();

    const FILE = `${DATA_DIR}/${DATA_FILE}-${offset}.json`;
    // dump the response to the file
    await fs.writeFile(FILE, JSON.stringify(json, null, 2));
    console.log(`Saved to ${FILE}`);

    if (json.bills.length === 0) {
      console.log('No more bills to fetch');
      process.exit(0);
    }

    offset += json.bills.length;
  }
}

main().catch(console.error);
