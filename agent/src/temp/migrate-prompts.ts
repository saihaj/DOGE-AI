import { botConfig, db, eq } from 'database';
import { PROMPTS } from '../twitter/prompts';

async function main() {
  const promptKeys = Object.keys(PROMPTS);

  for (const key of promptKeys) {
    const promptValue = await db.query.botConfig.findFirst({
      where: eq(botConfig.key, key),
      columns: {
        value: true,
      },
    });

    console.log({ key, promptValue });
  }
}

main().catch(console.error);
