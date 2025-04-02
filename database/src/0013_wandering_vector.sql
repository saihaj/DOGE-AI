CREATE TABLE `Prompt` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`description` text,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`meta` blob,
	`latestCommitId` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Prompt_key_unique` ON `Prompt` (`key`);--> statement-breakpoint
CREATE TABLE `PromptCommit` (
	`id` text PRIMARY KEY NOT NULL,
	`promptId` text NOT NULL,
	`parentCommitId` text,
	`content` text NOT NULL,
	`message` text,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`meta` blob,
	FOREIGN KEY (`parentCommitId`) REFERENCES `PromptCommit`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `PromptCommit_prompt_id` ON `PromptCommit` (`promptId`);