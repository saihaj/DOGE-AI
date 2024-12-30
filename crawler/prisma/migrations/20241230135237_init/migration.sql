-- CreateTable
CREATE TABLE "Bill" (
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
    "spending" TEXT NOT NULL
);
