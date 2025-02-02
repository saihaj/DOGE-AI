CREATE TABLE `Document` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`meta` blob
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_BillVector` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`bill` text,
	`document` text,
	`vector` F32_BLOB(1536) NOT NULL,
	`text` text NOT NULL,
	`source` text NOT NULL,
	FOREIGN KEY (`bill`) REFERENCES `Bill`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document`) REFERENCES `Document`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_BillVector`("id", "createdAt", "updatedAt", "bill", "vector", "text", "source") SELECT "id", "createdAt", "updatedAt", "bill", "vector", "text", "source" FROM `BillVector`;--> statement-breakpoint
DROP TABLE `BillVector`;--> statement-breakpoint
ALTER TABLE `__new_BillVector` RENAME TO `BillVector`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint