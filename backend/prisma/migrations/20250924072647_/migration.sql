/*
  Warnings:

  - You are about to drop the `AiAnalysis` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BrokerAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChecklistItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChecklistRule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Playbook` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlaybookSetup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SmartLimit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Trade` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TradeJournal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TradingObjective` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AiAnalysis" DROP CONSTRAINT "AiAnalysis_tradeId_fkey";

-- DropForeignKey
ALTER TABLE "BrokerAccount" DROP CONSTRAINT "BrokerAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "ChecklistItem" DROP CONSTRAINT "ChecklistItem_setupId_fkey";

-- DropForeignKey
ALTER TABLE "ChecklistRule" DROP CONSTRAINT "ChecklistRule_userId_fkey";

-- DropForeignKey
ALTER TABLE "Playbook" DROP CONSTRAINT "Playbook_userId_fkey";

-- DropForeignKey
ALTER TABLE "PlaybookSetup" DROP CONSTRAINT "PlaybookSetup_playbookId_fkey";

-- DropForeignKey
ALTER TABLE "SmartLimit" DROP CONSTRAINT "SmartLimit_brokerAccountId_fkey";

-- DropForeignKey
ALTER TABLE "Trade" DROP CONSTRAINT "Trade_brokerAccountId_fkey";

-- DropForeignKey
ALTER TABLE "Trade" DROP CONSTRAINT "Trade_playbookId_fkey";

-- DropForeignKey
ALTER TABLE "Trade" DROP CONSTRAINT "Trade_userId_fkey";

-- DropForeignKey
ALTER TABLE "TradeJournal" DROP CONSTRAINT "TradeJournal_tradeId_fkey";

-- DropForeignKey
ALTER TABLE "TradingObjective" DROP CONSTRAINT "TradingObjective_brokerAccountId_fkey";

-- DropTable
DROP TABLE "AiAnalysis";

-- DropTable
DROP TABLE "BrokerAccount";

-- DropTable
DROP TABLE "ChecklistItem";

-- DropTable
DROP TABLE "ChecklistRule";

-- DropTable
DROP TABLE "Playbook";

-- DropTable
DROP TABLE "PlaybookSetup";

-- DropTable
DROP TABLE "SmartLimit";

-- DropTable
DROP TABLE "Trade";

-- DropTable
DROP TABLE "TradeJournal";

-- DropTable
DROP TABLE "TradingObjective";

-- CreateTable
CREATE TABLE "broker_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BrokerAccountType" NOT NULL,
    "initialBalance" DOUBLE PRECISION NOT NULL,
    "currentBalance" DOUBLE PRECISION NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbooks" (
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

    CONSTRAINT "playbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbook_setups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "screenshotBeforeUrl" TEXT,
    "screenshotAfterUrl" TEXT,
    "playbookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playbook_setups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "ChecklistItemType" NOT NULL,
    "setupId" TEXT NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_rules" (
    "id" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitDate" TIMESTAMP(3),
    "direction" "Direction" NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "exitPrice" DOUBLE PRECISION,
    "riskPercentage" DOUBLE PRECISION NOT NULL,
    "rr" DOUBLE PRECISION,
    "profitLoss" DOUBLE PRECISION,
    "result" "TradeResult",
    "isPendingOrder" BOOLEAN NOT NULL DEFAULT false,
    "lotSize" DOUBLE PRECISION,
    "stopLoss" DOUBLE PRECISION,
    "takeProfit" DOUBLE PRECISION,
    "commission" DOUBLE PRECISION,
    "swap" DOUBLE PRECISION,
    "screenshotBeforeUrl" TEXT,
    "screenshotAfterUrl" TEXT,
    "userId" TEXT NOT NULL,
    "brokerAccountId" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_journals" (
    "id" TEXT NOT NULL,
    "mindsetBefore" TEXT NOT NULL,
    "exitReasoning" TEXT NOT NULL,
    "lessonsLearned" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tradeId" TEXT NOT NULL,

    CONSTRAINT "trade_journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "mistakes" JSONB NOT NULL,
    "goodPoints" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tradeId" TEXT NOT NULL,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_objectives" (
    "id" TEXT NOT NULL,
    "profitTarget" DOUBLE PRECISION,
    "minTradingDays" INTEGER,
    "maxLoss" DOUBLE PRECISION,
    "maxDailyLoss" DOUBLE PRECISION,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brokerAccountId" TEXT NOT NULL,

    CONSTRAINT "trading_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_limits" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxRiskPerTrade" DOUBLE PRECISION,
    "maxTradesPerDay" INTEGER,
    "maxLossesPerDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brokerAccountId" TEXT NOT NULL,

    CONSTRAINT "smart_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_specifications" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "valuePerPoint" DOUBLE PRECISION NOT NULL,
    "pipSize" DOUBLE PRECISION NOT NULL,
    "lotSize" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "asset_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "broker_accounts_userId_idx" ON "broker_accounts"("userId");

-- CreateIndex
CREATE INDEX "playbooks_userId_idx" ON "playbooks"("userId");

-- CreateIndex
CREATE INDEX "playbook_setups_playbookId_idx" ON "playbook_setups"("playbookId");

-- CreateIndex
CREATE INDEX "checklist_items_setupId_idx" ON "checklist_items"("setupId");

-- CreateIndex
CREATE INDEX "checklist_rules_userId_idx" ON "checklist_rules"("userId");

-- CreateIndex
CREATE INDEX "trades_userId_idx" ON "trades"("userId");

-- CreateIndex
CREATE INDEX "trades_brokerAccountId_idx" ON "trades"("brokerAccountId");

-- CreateIndex
CREATE INDEX "trades_playbookId_idx" ON "trades"("playbookId");

-- CreateIndex
CREATE UNIQUE INDEX "trade_journals_tradeId_key" ON "trade_journals"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analyses_tradeId_key" ON "ai_analyses"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "trading_objectives_brokerAccountId_key" ON "trading_objectives"("brokerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "smart_limits_brokerAccountId_key" ON "smart_limits"("brokerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_specifications_symbol_key" ON "asset_specifications"("symbol");

-- AddForeignKey
ALTER TABLE "broker_accounts" ADD CONSTRAINT "broker_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_setups" ADD CONSTRAINT "playbook_setups_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "playbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "playbook_setups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_rules" ADD CONSTRAINT "checklist_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_brokerAccountId_fkey" FOREIGN KEY ("brokerAccountId") REFERENCES "broker_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "playbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_journals" ADD CONSTRAINT "trade_journals_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_objectives" ADD CONSTRAINT "trading_objectives_brokerAccountId_fkey" FOREIGN KEY ("brokerAccountId") REFERENCES "broker_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_limits" ADD CONSTRAINT "smart_limits_brokerAccountId_fkey" FOREIGN KEY ("brokerAccountId") REFERENCES "broker_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
