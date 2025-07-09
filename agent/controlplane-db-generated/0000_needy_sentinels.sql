CREATE TABLE `Organization` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`location` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Organization_slug_unique` ON `Organization` (`slug`);--> statement-breakpoint
CREATE TABLE `OrganizationDatabase` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`hostname` text NOT NULL,
	`organization` text NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`organization`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_name_organization` ON `OrganizationDatabase` (`name`,`organization`);--> statement-breakpoint
CREATE TABLE `Prompt` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`description` text,
	`organization` text NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`meta` blob,
	`latestCommitId` text NOT NULL,
	FOREIGN KEY (`organization`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_key_organization` ON `Prompt` (`key`,`organization`);--> statement-breakpoint
CREATE TABLE `PromptCommit` (
	`id` text PRIMARY KEY NOT NULL,
	`promptId` text NOT NULL,
	`parentCommitId` text,
	`content` text NOT NULL,
	`message` text,
	`organization` text NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`meta` blob,
	FOREIGN KEY (`organization`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parentCommitId`) REFERENCES `PromptCommit`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `PromptCommit_prompt_id` ON `PromptCommit` (`promptId`);
