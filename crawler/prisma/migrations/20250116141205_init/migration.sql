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
    "spending" TEXT NOT NULL,
    "introducedDate" TEXT NOT NULL,
    "updateDate" TEXT NOT NULL,
    "sponsorFirstName" TEXT NOT NULL,
    "sponsorLastName" TEXT NOT NULL,
    "sponsorParty" TEXT NOT NULL,
    "sponsorInfoRaw" BLOB NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Bill_congress_number_type_key" ON "Bill"("congress", "number", "type");
