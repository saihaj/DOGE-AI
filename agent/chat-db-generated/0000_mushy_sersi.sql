CREATE TABLE `Chat` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`title` text NOT NULL,
	`user` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	FOREIGN KEY (`user`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Message` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`role` text NOT NULL,
	`parts` blob NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `Chat`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`privy_id` text NOT NULL,
	`meta` blob
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_privy_id_unique` ON `User` (`privy_id`);--> statement-breakpoint
CREATE TABLE `Vote` (
	`chat` text NOT NULL,
	`message` text NOT NULL,
	`is_upvoted` integer NOT NULL,
	`created_at` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	PRIMARY KEY(`chat`, `message`),
	FOREIGN KEY (`chat`) REFERENCES `Chat`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message`) REFERENCES `Message`(`id`) ON UPDATE no action ON DELETE cascade
);
