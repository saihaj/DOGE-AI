import { TWITTER_API_BASE_URL, TWITTER_API_KEY } from '../const';
import { logger } from '../logger';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chunk } from 'lodash-es';

const log = logger.child({ module: 'cli-get-user-info' });

const API_URL = new URL(
  `${TWITTER_API_BASE_URL}/twitter/user/batch_info_by_ids`,
);

async function main() {
  // const IDS = followers.map(a => a.follower.accountId);
  // const chunkedIds = chunk(IDS, 100);
  // log.info({ total: IDS.length, chunks: chunkedIds.length }, 'Starting');
  // for (const ids of chunkedIds) {
  //   await fetchUserInfo(ids);
  // }
}

async function fetchUserInfo(userIds: string[]) {
  API_URL.searchParams.set('userIds', userIds.join(','));

  log.info({}, 'Fetching user info');
  const data = await fetch(API_URL, {
    method: 'GET',
    headers: {
      'X-API-Key': TWITTER_API_KEY,
    },
  });

  log.info({ status: data.status }, 'Fetched user info');
  if (!data.ok) {
    const errorText = await data.text();
    log.error(
      { status: data.status, error: errorText },
      'Error fetching user info',
    );
    throw new Error(`Error fetching user info: ${data.status} - ${errorText}`);
  }

  const json = await data.json();

  const outPath = path.join(
    'dev-test/twitter-follower-info',
    `user-info-${Date.now()}.json`,
  );
  await writeFile(outPath, JSON.stringify(json, null, 2), 'utf-8');
  log.info({ outPath }, 'Wrote user info to file');
}

main().catch(console.error);
