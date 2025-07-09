CREATE TABLE `TerminalChat` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`title` text NOT NULL,
	`user` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	FOREIGN KEY (`user`) REFERENCES `TerminalUser`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `TerminalMessage` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`role` text NOT NULL,
	`parts` blob NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `TerminalChat`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `TerminalUser` (
	`id` text PRIMARY KEY NOT NULL,
	`privy_id` text NOT NULL,
	`meta` blob
);
--> statement-breakpoint
CREATE UNIQUE INDEX `TerminalUser_privy_id_unique` ON `TerminalUser` (`privy_id`);--> statement-breakpoint
CREATE TABLE `TweetConversation` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`user` text NOT NULL,
	`tweetId` text,
	FOREIGN KEY (`user`) REFERENCES `TweetUser`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tweet_idx` ON `TweetConversation` (`tweetId`);--> statement-breakpoint
CREATE TABLE `TweetMessage` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`role` text NOT NULL,
	`chat` text NOT NULL,
	`text` text NOT NULL,
	`tweetId` text,
	`meta` blob,
	FOREIGN KEY (`chat`) REFERENCES `TweetConversation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_idx` ON `TweetMessage` (`chat`);--> statement-breakpoint
CREATE TABLE `TweetUser` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`twitterId` text NOT NULL
);
