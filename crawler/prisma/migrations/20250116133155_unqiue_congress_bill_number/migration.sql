/*
  Warnings:

  - A unique constraint covering the columns `[congress,number,type]` on the table `Bill` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Bill_congress_number_type_key" ON "Bill"("congress", "number", "type");
