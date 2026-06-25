-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "confidence" INTEGER,
ADD COLUMN     "mae" DOUBLE PRECISION,
ADD COLUMN     "mfe" DOUBLE PRECISION,
ADD COLUMN     "preTradeChecklistState" JSONB,
ADD COLUMN     "realisedR" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "MistakeTag" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MistakeTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeMistake" (
    "tradeId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "TradeMistake_pkey" PRIMARY KEY ("tradeId","tagId")
);

-- CreateTable
CREATE TABLE "ProcessedWebhookEvent" (
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE UNIQUE INDEX "MistakeTag_userId_label_key" ON "MistakeTag"("userId", "label");

-- AddForeignKey
ALTER TABLE "MistakeTag" ADD CONSTRAINT "MistakeTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeMistake" ADD CONSTRAINT "TradeMistake_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeMistake" ADD CONSTRAINT "TradeMistake_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "MistakeTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

