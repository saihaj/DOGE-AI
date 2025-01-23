DROP INDEX "Bill_congress_number_type_key";--> statement-breakpoint
ALTER TABLE `BillVector` ALTER COLUMN "vector" TO "vector" F32_BLOB(1536);--> statement-breakpoint
CREATE UNIQUE INDEX `Bill_congress_number_type_key` ON `Bill` (`congress`,`number`,`type`);