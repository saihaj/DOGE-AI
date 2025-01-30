// import { botConfig, db } from 'database';
// // import { ENGAGEMENT_DECISION_PROMPT } from '../twitter/prompts';

// async function main() {
//   const inteer = await db
//     .insert(botConfig)
//     .values([
//       {
//         key: 'INTERACTION_REFINE_OUTPUT_PROMPT',
//         value: SHORT_PROMPT,
//       },
//     ])
//     .onConflictDoUpdate({
//       target: [botConfig.key],
//       set: {
//         value: SHORT_PROMPT,
//       },
//     });
//   console.log('Inserted:', inteer);
// }

// main().catch(console.error);
