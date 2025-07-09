CREATE TABLE `Document` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`meta` blob,
	`content` blob,
	`source` text
);
--> statement-breakpoint
CREATE INDEX `id_source_key` ON `Document` (`id`,`source`);--> statement-breakpoint
CREATE TABLE `DocumentVector` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`document` text NOT NULL,
	`vector` F32_BLOB(1536) NOT NULL,
	`text` text NOT NULL,
	`source` text NOT NULL,
	FOREIGN KEY (`document`) REFERENCES `Document`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `source_idx` ON `DocumentVector` (`source`);--> statement-breakpoint
CREATE INDEX `document_key` ON `DocumentVector` (`document`);
CREATE INDEX `vector_idx` ON `DocumentVector` (libsql_vector_idx(`vector`));
