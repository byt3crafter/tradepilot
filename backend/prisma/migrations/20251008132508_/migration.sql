/*
  Warnings:

  - You are about to drop the column `screenshotUrl` on the `analyses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "analyses" DROP COLUMN "screenshotUrl",
ADD COLUMN     "screenshotUrls" TEXT[],
ALTER COLUMN "htf" DROP NOT NULL;
