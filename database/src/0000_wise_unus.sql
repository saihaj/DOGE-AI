CREATE TABLE `_prisma_migrations` (
	`id` text PRIMARY KEY NOT NULL,
	`checksum` text NOT NULL,
	`finished_at` numeric,
	`migration_name` text NOT NULL,
	`logs` text,
	`rolled_back_at` numeric,
	`started_at` numeric DEFAULT (current_timestamp) NOT NULL,
	`applied_steps_count` integer DEFAULT 0 NOT NULL
);
CREATE TABLE `Bill` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	`type` text NOT NULL,
	`number` integer NOT NULL,
	`congress` integer NOT NULL,
	`originChamber` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`htmlVersionUrl` text NOT NULL,
	`pdfVersionUrl` text,
	`xmlVersionUrl` text,
	`content` blob NOT NULL,
	`summary` text NOT NULL,
	`impact` text NOT NULL,
	`funding` text NOT NULL,
	`spending` text NOT NULL,
	`introducedDate` text NOT NULL,
	`updateDate` text NOT NULL,
	`sponsorFirstName` text NOT NULL,
	`sponsorLastName` text NOT NULL,
	`sponsorParty` text NOT NULL,
	`sponsorInfoRaw` blob NOT NULL
);
CREATE UNIQUE INDEX `Bill_congress_number_type_key` ON `Bill` (`congress`,`number`,`type`);
