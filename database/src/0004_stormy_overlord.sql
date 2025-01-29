CREATE TABLE `BotConfig` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `BotConfig_key_unique` ON `BotConfig` (`key`);--> statement-breakpoint
CREATE TABLE `__drizzle_migrations` (

);
--> statement-breakpoint
DROP INDEX `Message_tweetId_unique`;--> statement-breakpoint
DROP INDEX "Bill_congress_number_type_key";--> statement-breakpoint
DROP INDEX "BotConfig_key_unique";--> statement-breakpoint
DROP INDEX "Chat_tweetId_unique";--> statement-breakpoint
DROP INDEX "User_twitterId_unique";--> statement-breakpoint
ALTER TABLE `BillVector` ALTER COLUMN "vector" TO "vector" numeric;--> statement-breakpoint
CREATE UNIQUE INDEX `Bill_congress_number_type_key` ON `Bill` (`congress`,`number`,`type`);--> statement-breakpoint
CREATE UNIQUE INDEX `Chat_tweetId_unique` ON `Chat` (`tweetId`);--> statement-breakpoint
CREATE UNIQUE INDEX `User_twitterId_unique` ON `User` (`twitterId`);--> statement-breakpoint
ALTER TABLE `MessageVector` ALTER COLUMN "vector" TO "vector" numeric;