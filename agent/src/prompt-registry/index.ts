import { db, eq, prompt, promptCommit } from 'database';

export async function getLatestPrompt(key: string) {
  return db
    .select({
      commitId: promptCommit.id,
      promptId: promptCommit.promptId,
      content: promptCommit.content,
    })
    .from(promptCommit)
    .where(
      eq(
        promptCommit.promptId,
        db
          .select({ id: prompt.latestCommitId })
          .from(prompt)
          .where(eq(prompt.key, key)),
      ),
    )
    .get();
}

// // Initialize a new prompt
// export const initPrompt = (name, description) => {
//   const result = db
//     .insert(prompts)
//     .values({ name, description })
//     .returning({ promptId: prompts.promptId })
//     .get();
//   return result.promptId;
// };

// // Commit a new version
// export const commit = (promptName, content, commitMessage) => {
//   const prompt = getPromptByName(promptName);
//   if (!prompt) throw new Error(`Prompt "${promptName}" not found`);

//   const latestCommit = getLatestCommit(prompt.promptId);
//   const parentCommitId = latestCommit ? latestCommit.commitId : null;

//   // Insert new commit
//   const newCommit = db
//     .insert(commits)
//     .values({
//       promptId: prompt.promptId,
//       parentCommitId,
//       content,
//       commitMessage,
//     })
//     .returning({ commitId: commits.commitId })
//     .get();

//   // Update latest_commit_id
//   db.update(prompts)
//     .set({ latestCommitId: newCommit.commitId })
//     .where(eq(prompts.promptId, prompt.promptId))
//     .run();

//   return newCommit.commitId;
// };

// // Revert to a previous commit
// export const revert = (promptName, targetCommitId) => {
//   const prompt = getPromptByName(promptName);
//   if (!prompt) throw new Error(`Prompt "${promptName}" not found`);

//   const targetCommit = getCommitById(targetCommitId);
//   if (!targetCommit) throw new Error(`Commit ${targetCommitId} not found`);

//   const latestCommit = getLatestCommit(prompt.promptId);
//   const parentCommitId = latestCommit ? latestCommit.commitId : null;

//   // Insert new commit with target content
//   const newCommit = db
//     .insert(commits)
//     .values({
//       promptId: prompt.promptId,
//       parentCommitId,
//       content: targetCommit.content,
//       commitMessage: `Reverted to commit ${targetCommitId}`,
//     })
//     .returning({ commitId: commits.commitId })
//     .get();

//   // Update latest_commit_id
//   db.update(prompts)
//     .set({ latestCommitId: newCommit.commitId })
//     .where(eq(prompts.promptId, prompt.promptId))
//     .run();

//   return newCommit.commitId;
// };

// // Get commit history
// export const getHistory = promptName => {
//   const prompt = getPromptByName(promptName);
//   if (!prompt) throw new Error(`Prompt "${promptName}" not found`);

//   return db
//     .select()
//     .from(commits)
//     .where(eq(commits.promptId, prompt.promptId))
//     .orderBy(commits.createdAt, 'desc')
//     .all();
// };

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
