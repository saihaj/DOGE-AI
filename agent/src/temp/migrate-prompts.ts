import { PROMPTS } from '../twitter/prompts';

async function main() {
  const promptKeys = Object.keys(PROMPTS);

  for (const key of promptKeys) {
    const prompt = PROMPTS[key];
    if (prompt && prompt.name) {
      console.log(`Name: ${prompt.name}`);
    } else {
      console.log(`No name found for key: ${key}`);
    }
  }
}

main().catch(console.error);
