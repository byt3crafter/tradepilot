/*
  Warnings:

  - You are about to drop the `ai_analyses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analyses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analysis_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `asset_specifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auth_audits` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `broker_accounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `checklist_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `checklist_rules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `password_reset_tokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `playbook_setups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `playbooks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `refresh_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `smart_limits` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trade_journals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trades` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trading_objectives` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verification_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- DropForeignKey
ALTER TABLE "ai_analyses" DROP CONSTRAINT "ai_analyses_tradeId_fkey";

-- DropForeignKey
ALTER TABLE "analyses" DROP CONSTRAINT "analyses_brokerId_fkey";

-- DropForeignKey
ALTER TABLE "analyses" DROP CONSTRAINT "analyses_parentAnalysisId_fkey";

-- DropForeignKey
ALTER TABLE "analyses" DROP CONSTRAINT "analyses_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "analyses" DROP CONSTRAINT "analyses_userId_fkey";

-- DropForeignKey
ALTER TABLE "analysis_sessions" DROP CONSTRAINT "analysis_sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "asset_specifications" DROP CONSTRAINT "asset_specifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "auth_audits" DROP CONSTRAINT "auth_audits_userId_fkey";

-- DropForeignKey
ALTER TABLE "broker_accounts" DROP CONSTRAINT "broker_accounts_userId_fkey";

-- DropForeignKey
ALTER TABLE "checklist_items" DROP CONSTRAINT "checklist_items_setupId_fkey";

-- DropForeignKey
ALTER TABLE "checklist_rules" DROP CONSTRAINT "checklist_rules_userId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_analysisId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "playbook_setups" DROP CONSTRAINT "playbook_setups_playbookId_fkey";

-- DropForeignKey
ALTER TABLE "playbooks" DROP CONSTRAINT "playbooks_userId_fkey";

-- DropForeignKey
ALTER TABLE "refresh_sessions" DROP CONSTRAINT "refresh_sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "smart_limits" DROP CONSTRAINT "smart_limits_brokerAccountId_fkey";

-- DropForeignKey
ALTER TABLE "trade_journals" DROP CONSTRAINT "trade_journals_tradeId_fkey";

-- DropForeignKey
ALTER TABLE "trades" DROP CONSTRAINT "trades_brokerAccountId_fkey";

-- DropForeignKey
ALTER TABLE "trades" DROP CONSTRAINT "trades_playbookId_fkey";

-- DropForeignKey
ALTER TABLE "trades" DROP CONSTRAINT "trades_userId_fkey";

-- DropForeignKey
ALTER TABLE "trading_objectives" DROP CONSTRAINT "trading_objectives_brokerAccountId_fkey";

-- DropForeignKey
ALTER TABLE "verification_tokens" DROP CONSTRAINT "verification_tokens_userId_fkey";

-- DropTable
DROP TABLE "ai_analyses";

-- DropTable
DROP TABLE "analyses";

-- DropTable
DROP TABLE "analysis_sessions";

-- DropTable
DROP TABLE "asset_specifications";

-- DropTable
DROP TABLE "auth_audits";

-- DropTable
DROP TABLE "broker_accounts";

-- DropTable
DROP TABLE "checklist_items";

-- DropTable
DROP TABLE "checklist_rules";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "password_reset_tokens";

-- DropTable
DROP TABLE "playbook_setups";

-- DropTable
DROP TABLE "playbooks";

-- DropTable
DROP TABLE "refresh_sessions";

-- DropTable
DROP TABLE "smart_limits";

-- DropTable
DROP TABLE "trade_journals";

-- DropTable
DROP TABLE "trades";

-- DropTable
DROP TABLE "trading_objectives";

-- DropTable
DROP TABLE "users";

-- DropTable
DROP TABLE "verification_tokens";

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "trialEndsAt" TIMESTAMP(3),
    "proAccessExpiresAt" TIMESTAMP(3),
    "proAccessReason" TEXT,
    "paddleCustomerId" TEXT,
    "paddleSubscriptionId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BrokerAccountType" NOT NULL,
    "initialBalance" DOUBLE PRECISION NOT NULL,
    "currentBalance" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "leverage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "BrokerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingObjective" (
    "id" TEXT NOT NULL,
    "profitTarget" DOUBLE PRECISION,
    "minTradingDays" INTEGER,
    "maxLoss" DOUBLE PRECISION,
    "maxDailyLoss" DOUBLE PRECISION,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "brokerAccountId" TEXT NOT NULL,

    CONSTRAINT "TradingObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartLimit" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxRiskPerTrade" DOUBLE PRECISION,
    "maxTradesPerDay" INTEGER,
    "maxLossesPerDay" INTEGER,
    "brokerAccountId" TEXT NOT NULL,

    CONSTRAINT "SmartLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitDate" TIMESTAMP(3),
    "asset" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "brokerAccountId" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAnalysis" (
    "id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "mistakes" JSONB NOT NULL,
    "goodPoints" JSONB NOT NULL,
    "tradeId" TEXT NOT NULL,

    CONSTRAINT "AiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeJournal" (
    "id" TEXT NOT NULL,
    "mindsetBefore" TEXT NOT NULL,
    "exitReasoning" TEXT NOT NULL,
    "lessonsLearned" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,

    CONSTRAINT "TradeJournal_pkey" PRIMARY KEY ("id")
);

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookSetup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "screenshotBeforeUrl" TEXT,
    "screenshotAfterUrl" TEXT,
    "playbookId" TEXT NOT NULL,

    CONSTRAINT "PlaybookSetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "ChecklistItemType" NOT NULL,
    "playbookSetupId" TEXT NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistRule" (
    "id" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ChecklistRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetSpecification" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pipSize" DOUBLE PRECISION,
    "lotSize" DOUBLE PRECISION,
    "valuePerPoint" DOUBLE PRECISION,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AssetSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "screenshotUrls" TEXT[],
    "category" "IncomeCategory" NOT NULL,
    "assetClass" "AssetClass" NOT NULL,
    "marketVenue" "MarketVenue" NOT NULL,
    "instrumentSubtype" "InstrumentSubtype",
    "contract" JSONB,
    "leverage" INTEGER,
    "symbol" TEXT NOT NULL,
    "platforms" JSONB,
    "htf" TEXT,
    "ltf" TEXT[],
    "directionalBias" "Direction" NOT NULL,
    "structureNotes" TEXT,
    "levels" JSONB,
    "triggers" JSONB,
    "invalidation" JSONB,
    "validityStartsAt" TIMESTAMP(3),
    "validityExpiresAt" TIMESTAMP(3),
    "reviewCycle" "ReviewCycle" NOT NULL,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'WATCHING',
    "tags" TEXT[],
    "revision" INTEGER NOT NULL DEFAULT 1,
    "parentAnalysisId" TEXT,
    "userId" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "sessionId" TEXT,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "type" "VerificationTokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "payload" JSONB,
    "userId" TEXT NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAudit" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "emailTried" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "AuthAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_paddleCustomerId_key" ON "User"("paddleCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_paddleSubscriptionId_key" ON "User"("paddleSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "TradingObjective_brokerAccountId_key" ON "TradingObjective"("brokerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SmartLimit_brokerAccountId_key" ON "SmartLimit"("brokerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "AiAnalysis_tradeId_key" ON "AiAnalysis"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeJournal_tradeId_key" ON "TradeJournal"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetSpecification_userId_symbol_key" ON "AssetSpecification"("userId", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_tokenHash_key" ON "VerificationToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "BrokerAccount" ADD CONSTRAINT "BrokerAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingObjective" ADD CONSTRAINT "TradingObjective_brokerAccountId_fkey" FOREIGN KEY ("brokerAccountId") REFERENCES "BrokerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartLimit" ADD CONSTRAINT "SmartLimit_brokerAccountId_fkey" FOREIGN KEY ("brokerAccountId") REFERENCES "BrokerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_brokerAccountId_fkey" FOREIGN KEY ("brokerAccountId") REFERENCES "BrokerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAnalysis" ADD CONSTRAINT "AiAnalysis_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeJournal" ADD CONSTRAINT "TradeJournal_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookSetup" ADD CONSTRAINT "PlaybookSetup_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_playbookSetupId_fkey" FOREIGN KEY ("playbookSetupId") REFERENCES "PlaybookSetup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistRule" ADD CONSTRAINT "ChecklistRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSpecification" ADD CONSTRAINT "AssetSpecification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "BrokerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAudit" ADD CONSTRAINT "AuthAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
