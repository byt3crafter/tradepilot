-- CreateEnum
CREATE TYPE "DrawdownType" AS ENUM ('TRAILING', 'STATIC');

-- CreateTable
CREATE TABLE "PropFirmTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firmName" TEXT NOT NULL,
    "accountSize" DOUBLE PRECISION NOT NULL,
    "profitTarget" DOUBLE PRECISION NOT NULL,
    "dailyDrawdown" DOUBLE PRECISION NOT NULL,
    "maxDrawdown" DOUBLE PRECISION NOT NULL,
    "drawdownType" "DrawdownType" NOT NULL DEFAULT 'TRAILING',
    "minTradingDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropFirmTemplate_pkey" PRIMARY KEY ("id")
);

-- AlterTable BrokerAccount - Add templateId
ALTER TABLE "BrokerAccount" ADD COLUMN "templateId" TEXT;

-- AddForeignKey
ALTER TABLE "BrokerAccount" ADD CONSTRAINT "BrokerAccount_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PropFirmTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
