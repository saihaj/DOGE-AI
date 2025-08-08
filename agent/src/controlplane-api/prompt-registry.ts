import { eq, and } from 'database';
import { ControlPlaneDbInstance as db } from './db';
import {
  ControlPlaneOrganization,
  ControlPlanePrompt,
  ControlPlanePromptCommit,
} from './schema';
import * as crypto from 'node:crypto';
import { bento } from '../cache';

const createCacheKey = ({ key, orgId }: { key: string; orgId: string }) =>
  `PROMPT_${orgId}_${key}`;

/**
 * This is cached version of {@link getLatestPrompt}.
 *
 * If you are looking to just get the prompt content, use {@link getPromptContent}
 */
export async function getPrompt({
  key,
  orgId,
}: {
  key: string;
  orgId: string;
}) {
  return bento.getOrSet(
    createCacheKey({ key, orgId }),
    async () => {
      const prompt = await getLatestPrompt({ key, orgId });
      if (!prompt) {
        throw new Error(`"${key}" not found for org "${orgId}"`);
      }

      return prompt;
    },
    { ttl: '1d' },
  );
}

export async function getPromptContent({
  key,
  orgId,
}: {
  key: string;
  orgId: string;
}) {
  const prompt = await getPrompt({ key, orgId });
  if (!prompt) {
    throw new Error(`"${key}" not found for org "${orgId}"`);
  }
  return prompt.content;
}

/**
 * Meant for DB query.
 * For public API use {@link getPrompt}
 */
async function getLatestPrompt({ key, orgId }: { key: string; orgId: string }) {
  const prompt = await db
    .select({
      id: ControlPlanePrompt.id,
      latestCommitId: ControlPlanePrompt.latestCommitId,
    })
    .from(ControlPlanePrompt)
    .where(
      and(
        eq(ControlPlanePrompt.key, key),
        eq(ControlPlanePrompt.organization, orgId),
      ),
    )
    .get();

  if (!prompt) {
    throw new Error(`Prompt "${key}" not found for org "${orgId}"`);
  }

  return db
    .select({
      commitId: ControlPlanePromptCommit.id,
      parentCommitId: ControlPlanePromptCommit.parentCommitId,
      promptId: ControlPlanePromptCommit.promptId,
      content: ControlPlanePromptCommit.content,
    })
    .from(ControlPlanePromptCommit)
    .where(
      and(
        eq(ControlPlanePromptCommit.promptId, prompt.id),
        eq(ControlPlanePromptCommit.id, prompt.latestCommitId),
      ),
    )
    .get();
}

export async function commitPrompt({
  key,
  message,
  orgId,
  value,
}: {
  key: string;
  orgId: string;
  message: string;
  value: string;
}) {
  const lastPrompt = await getLatestPrompt({ key, orgId });
  if (!lastPrompt) {
    throw new Error(`Prompt "${key}" not found for org "${orgId}"`);
  }

  const newCommit = await db.transaction(async tx => {
    const newCommitId = crypto.randomUUID();
    // Insert new commit
    const newCommit = await tx
      .insert(ControlPlanePromptCommit)
      .values({
        promptId: lastPrompt.promptId,
        parentCommitId: lastPrompt.commitId,
        content: value,
        organization: orgId,
        message,
        id: newCommitId,
      })
      .returning({ commitId: ControlPlanePromptCommit.id })
      .get();

    await tx
      .update(ControlPlanePrompt)
      .set({ latestCommitId: newCommitId })
      .where(eq(ControlPlanePrompt.id, lastPrompt.promptId))
      .run();

    const status = await bento.delete(createCacheKey({ key, orgId }));
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
  orgId,
}: {
  key: string;
  orgId: string;
  targetCommitId: string;
}) {
  const latestPrompt = await getLatestPrompt({ key, orgId });
  if (!latestPrompt)
    throw new Error(`Prompt "${key}" not found for org "${orgId}"`);

  const targetCommit = await db.query.ControlPlanePromptCommit.findFirst({
    where: eq(ControlPlanePromptCommit.id, targetCommitId),
    columns: {
      id: true,
      content: true,
    },
  });

  if (!targetCommit)
    throw new Error(`Commit "${targetCommitId}" not found for org "${orgId}"`);

  // update parent commit ID
  const version = await db
    .update(ControlPlanePrompt)
    .set({
      latestCommitId: targetCommit.id,
    })
    .where(eq(ControlPlanePrompt.id, latestPrompt.promptId))
    .returning({
      commitId: ControlPlanePrompt.latestCommitId,
    })
    .get();

  const status = await bento.delete(createCacheKey({ key, orgId }));
  if (!status) {
    throw new Error('Failed to delete cache');
  }

  return version;
}

// Initialize a new prompt
export async function initPrompt({
  key,
  value,
  orgId,
}: {
  key: string;
  orgId: string;
  value: string;
}) {
  const promptId = crypto.randomUUID();
  const commitId = crypto.randomUUID();

  // look for existing org
  const org = await db.query.ControlPlaneOrganization.findFirst({
    where: eq(ControlPlaneOrganization.id, orgId),
    columns: {
      id: true,
    },
  });

  if (!org) {
    throw new Error(`Organization "${orgId}" not found`);
  }

  const result = await db.transaction(async tx => {
    // Insert new prompt
    await tx
      .insert(ControlPlanePrompt)
      .values({
        key,
        latestCommitId: commitId,
        description: '',
        id: promptId,
        organization: orgId,
      })
      .run();

    // Insert initial commit
    return await tx
      .insert(ControlPlanePromptCommit)
      .values({
        promptId,
        content: value,
        message: 'Initial commit',
        id: commitId,
        organization: orgId,
      })
      .returning({ promptId: ControlPlanePromptCommit.id })
      .get();
  });

  return result;
}
