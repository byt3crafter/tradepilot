/*
  Warnings:

  - You are about to drop the column `strategyId` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `tradeDate` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the `Strategy` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `playbookId` to the `Trade` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ChecklistItemType" AS ENUM ('ENTRY_CRITERIA', 'RISK_MANAGEMENT');

-- DropForeignKey
ALTER TABLE "Strategy" DROP CONSTRAINT "Strategy_userId_fkey";

-- DropForeignKey
ALTER TABLE "Trade" DROP CONSTRAINT "Trade_strategyId_fkey";

-- DropIndex
DROP INDEX "Trade_strategyId_idx";

-- AlterTable
ALTER TABLE "Trade" DROP COLUMN "strategyId",
DROP COLUMN "tradeDate",
ADD COLUMN     "playbookId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Strategy";

-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coreIdea" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tradingStyles" TEXT[],
    "instruments" TEXT[],
    "timeframes" TEXT[],
    "pros" TEXT[],
    "cons" TEXT[],
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookSetup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "screenshotBeforeUrl" TEXT,
    "screenshotAfterUrl" TEXT,
    "playbookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaybookSetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "ChecklistItemType" NOT NULL,
    "setupId" TEXT NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Playbook_userId_idx" ON "Playbook"("userId");

-- CreateIndex
CREATE INDEX "PlaybookSetup_playbookId_idx" ON "PlaybookSetup"("playbookId");

-- CreateIndex
CREATE INDEX "ChecklistItem_setupId_idx" ON "ChecklistItem"("setupId");

-- CreateIndex
CREATE INDEX "Trade_playbookId_idx" ON "Trade"("playbookId");

-- AddForeignKey
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookSetup" ADD CONSTRAINT "PlaybookSetup_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "PlaybookSetup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
