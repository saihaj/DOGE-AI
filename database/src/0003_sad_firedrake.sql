CREATE TABLE `Chat` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`user` text NOT NULL,
	`tweetId` text,
	FOREIGN KEY (`user`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Chat_tweetId_unique` ON `Chat` (`tweetId`);--> statement-breakpoint
CREATE TABLE `Message` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`role` text NOT NULL,
	`chat` text NOT NULL,
	`text` text NOT NULL,
	`tweetId` text,
	FOREIGN KEY (`chat`) REFERENCES `Chat`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `MessageVector` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`message` text NOT NULL,
	`vector` F32_BLOB(1536),
	`text` text NOT NULL,
	FOREIGN KEY (`message`) REFERENCES `Message`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`twitterId` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_twitterId_unique` ON `User` (`twitterId`);