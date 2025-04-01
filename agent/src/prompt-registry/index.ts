import {
  db,
  eq,
  prompt as dbPromptSchema,
  promptCommit,
  desc,
  and,
} from 'database';
import * as crypto from 'node:crypto';

export async function getLatestPrompt(key: string) {
  const prompt = await db
    .select({
      id: dbPromptSchema.id,
      latestCommitId: dbPromptSchema.latestCommitId,
    })
    .from(dbPromptSchema)
    .where(eq(dbPromptSchema.key, key))
    .get();

  if (!prompt) {
    throw new Error(`Prompt "${key}" not found`);
  }

  return db
    .select({
      commitId: promptCommit.id,
      parentCommitId: promptCommit.parentCommitId,
      promptId: promptCommit.promptId,
      content: promptCommit.content,
    })
    .from(promptCommit)
    .where(
      and(
        eq(promptCommit.promptId, prompt.id),
        eq(promptCommit.id, prompt.latestCommitId),
      ),
    )
    .get();
}

export async function commitPrompt({
  key,
  message,
  value,
}: {
  key: string;
  message: string;
  value: string;
}) {
  const lastPrompt = await getLatestPrompt(key);
  if (!lastPrompt) throw new Error(`Prompt "${key}" not found`);

  const newCommit = await db.transaction(async tx => {
    const newCommitId = crypto.randomUUID();
    // Insert new commit
    const newCommit = await tx
      .insert(promptCommit)
      .values({
        promptId: lastPrompt.promptId,
        parentCommitId: lastPrompt.commitId,
        content: value,
        message,
        id: newCommitId,
      })
      .returning({ commitId: promptCommit.id })
      .get();

    await tx
      .update(dbPromptSchema)
      .set({ latestCommitId: newCommitId })
      .where(eq(dbPromptSchema.id, lastPrompt.promptId))
      .run();

    return newCommit;
  });

  return newCommit;
}

// Revert to a previous commit
export async function revertPrompt({
  key,
  targetCommitId,
}: {
  key: string;
  targetCommitId: string;
}) {
  const latestPrompt = getLatestPrompt(key);
  if (!latestPrompt) throw new Error(`Prompt "${key}" not found`);

  const targetCommit = await db.query.promptCommit.findFirst({
    where: eq(promptCommit.id, targetCommitId),
    columns: {
      id: true,
      content: true,
    },
  });

  if (!targetCommit) throw new Error(`Commit ${targetCommitId} not found`);

  const newCommit = await commitPrompt({
    key,
    message: `Reverted to commit ${targetCommitId}`,
    value: targetCommit.content,
  });

  return newCommit;
}

// Get commit history IDs
async function getPromptHistory(key: string) {
  const latestPrompt = await getLatestPrompt(key);
  if (!latestPrompt) throw new Error(`Prompt "${key}" not found`);

  return db
    .select({
      id: promptCommit.id,
      createdAt: promptCommit.createdAt,
    })
    .from(promptCommit)
    .where(eq(promptCommit.promptId, latestPrompt.promptId))
    .orderBy(desc(promptCommit.createdAt))
    .all();
}

// Initialize a new prompt
export async function initPrompt({
  key,
  value,
}: {
  key: string;
  value: string;
}) {
  const promptId = crypto.randomUUID();
  const commitId = crypto.randomUUID();

  const result = await db.transaction(async tx => {
    // Insert new prompt
    await tx
      .insert(dbPromptSchema)
      .values({
        key,
        latestCommitId: commitId,
        description: '',
        id: promptId,
      })
      .run();

    // Insert initial commit
    return await tx
      .insert(promptCommit)
      .values({
        promptId,
        content: value,
        message: 'Initial commit',
        id: commitId,
      })
      .returning({ promptId: promptCommit.id })
      .get();
  });

  return result;
}

// // Example usage
// const main = () => {
//   const promptId = initPrompt('Welcome Message', 'A welcome prompt');
//   console.log(`Initialized prompt with ID: ${promptId}`);

//   const c1 = commit('Welcome Message', 'Hello, welcome!', 'Initial commit');
//   console.log(`Commit 1: ${c1}`);
//   const c2 = commit('Welcome Message', 'Hi there!', 'Simplified tone');
//   console.log(`Commit 2: ${c2}`);
//   const c3 = commit('Welcome Message', 'Hey, welcome aboard!', 'More casual');
//   console.log(`Commit 3: ${c3}`);

//   console.log('Current:', getCurrent('Welcome Message'));
//   console.log('History:', getHistory('Welcome Message'));

//   const c4 = revert('Welcome Message', c1);
//   console.log(`Reverted to commit ${c1}, new commit: ${c4}`);
//   console.log('Current after revert:', getCurrent('Welcome Message'));
//   console.log('Updated History:', getHistory('Welcome Message'));
// };

// main();
