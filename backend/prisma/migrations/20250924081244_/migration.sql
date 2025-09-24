/*
  Warnings:

  - A unique constraint covering the columns `[userId,symbol]` on the table `asset_specifications` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `asset_specifications` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "asset_specifications_symbol_key";

-- AlterTable
ALTER TABLE "asset_specifications" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "asset_specifications_userId_symbol_key" ON "asset_specifications"("userId", "symbol");

-- AddForeignKey
ALTER TABLE "asset_specifications" ADD CONSTRAINT "asset_specifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
