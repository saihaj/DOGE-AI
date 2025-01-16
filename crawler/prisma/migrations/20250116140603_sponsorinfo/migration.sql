/*
  Warnings:

  - Added the required column `introducedDate` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sponsorFirstName` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sponsorInfoRaw` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sponsorLastName` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sponsorParty` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updateDate` to the `Bill` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "congress" INTEGER NOT NULL,
    "originChamber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "htmlVersionUrl" TEXT NOT NULL,
    "pdfVersionUrl" TEXT,
    "xmlVersionUrl" TEXT,
    "content" BLOB NOT NULL,
    "summary" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "funding" TEXT NOT NULL,
    "spending" TEXT NOT NULL,
    "introducedDate" TEXT NOT NULL,
    "updateDate" TEXT NOT NULL,
    "sponsorFirstName" TEXT NOT NULL,
    "sponsorLastName" TEXT NOT NULL,
    "sponsorParty" TEXT NOT NULL,
    "sponsorInfoRaw" BLOB NOT NULL
);
INSERT INTO "new_Bill" ("congress", "content", "createdAt", "funding", "htmlVersionUrl", "id", "impact", "number", "originChamber", "pdfVersionUrl", "spending", "summary", "title", "type", "updatedAt", "url", "xmlVersionUrl") SELECT "congress", "content", "createdAt", "funding", "htmlVersionUrl", "id", "impact", "number", "originChamber", "pdfVersionUrl", "spending", "summary", "title", "type", "updatedAt", "url", "xmlVersionUrl" FROM "Bill";
DROP TABLE "Bill";
ALTER TABLE "new_Bill" RENAME TO "Bill";
CREATE UNIQUE INDEX "Bill_congress_number_type_key" ON "Bill"("congress", "number", "type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
