import { initPrompt } from '../controlplane-api/prompt-registry';

async function main() {
  const r = await initPrompt({
    key: 'TEST',
    value: 'This is a test prompt',
    orgId: 'ffbd6b6f-4486-4f1d-add4-9c96efa453e5',
  });

  console.log('Prompt inserted successfully:', r);
}

main().catch(console.error);
