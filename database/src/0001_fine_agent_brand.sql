CREATE TABLE `BillVector` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`bill` text NOT NULL,
	`vector` F32_BLOB(512),
	`text` text NOT NULL,
	`source` text NOT NULL,
	FOREIGN KEY (`bill`) REFERENCES `Bill`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP INDEX "Bill_congress_number_type_key";--> statement-breakpoint
ALTER TABLE `Bill` ALTER COLUMN "updatedAt" TO "updatedAt" numeric NOT NULL DEFAULT (CURRENT_TIMESTAMP);--> statement-breakpoint
CREATE UNIQUE INDEX `Bill_congress_number_type_key` ON `Bill` (`congress`,`number`,`type`);