import {
  db,
  eq,
  prompt as dbPromptSchema,
  promptCommit,
  and,
  prompt,
} from 'database';
import * as crypto from 'node:crypto';
import { bento } from '../cache';

const createCacheKey = (key: string) => `BOT_CONFIG_${key}`;

/**
 * This is cached version of {@link getLatestPrompt}.
 *
 * If you are looking to just get the prompt content, use {@link getPromptContent}
 */
export async function getPrompt(key: string) {
  return bento.getOrSet(
    createCacheKey(key),
    async () => {
      const prompt = await getLatestPrompt(key);
      if (!prompt) {
        throw new Error(`${key} not found`);
      }

      return prompt;
    },
    { ttl: '1d' },
  );
}

export async function getPromptContent(key: string) {
  const prompt = await getPrompt(key);
  if (!prompt) {
    throw new Error(`${key} not found`);
  }
  return prompt.content;
}

/**
 * Meant for DB query.
 * For public API use {@link getPrompt}
 */
async function getLatestPrompt(key: string) {
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
  if (!lastPrompt) {
    throw new Error(`Prompt "${key}" not found`);
  }

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

    const status = await bento.delete(createCacheKey(key));
    if (!status) {
      throw new Error('Failed to delete cache');
    }

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
  const latestPrompt = await getLatestPrompt(key);
  if (!latestPrompt) throw new Error(`Prompt "${key}" not found`);

  const targetCommit = await db.query.promptCommit.findFirst({
    where: eq(promptCommit.id, targetCommitId),
    columns: {
      id: true,
      content: true,
    },
  });

  if (!targetCommit) throw new Error(`Commit ${targetCommitId} not found`);

  // update parent commit ID
  const version = await db
    .update(prompt)
    .set({
      latestCommitId: targetCommit.id,
    })
    .where(eq(prompt.id, latestPrompt.promptId))
    .returning({
      commitId: prompt.latestCommitId,
    })
    .get();

  const status = await bento.delete(createCacheKey(key));
  if (!status) {
    throw new Error('Failed to delete cache');
  }

  return version;
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
