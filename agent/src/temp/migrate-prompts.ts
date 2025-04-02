import { botConfig, db, eq } from 'database';
import { PROMPTS } from '../twitter/prompts';
import { initPrompt } from '../prompt-registry';

async function main() {
  const promptKeys = Object.keys(PROMPTS);

  for await (const key of promptKeys) {
    const promptValue = await db.query.botConfig.findFirst({
      where: eq(botConfig.key, key),
      columns: {
        value: true,
      },
    });

    if (!promptValue) {
      console.log(`${key} not found in database.`);
      continue;
    }

    const r = await initPrompt({
      key,
      value: promptValue.value,
    });

    console.log(`Prompt ${key} migrated successfully:`, r);
  }
}

main().catch(console.error);
