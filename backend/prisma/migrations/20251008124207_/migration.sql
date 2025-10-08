/*
  Warnings:

  - You are about to drop the `signal_log_ai_analyses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `signal_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "IncomeCategory" AS ENUM ('ACTIVE_INCOME', 'DAILY_INCOME', 'WEEKLY_INCOME', 'MONTHLY_INCOME', 'LONG_TERM_INCOME');

-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('FOREX', 'INDEX', 'METAL', 'CRYPTO', 'EQUITY', 'ENERGY');

-- CreateEnum
CREATE TYPE "MarketVenue" AS ENUM ('SPOT', 'CFD', 'FUTURES', 'PERP', 'OPTIONS');

-- CreateEnum
CREATE TYPE "InstrumentSubtype" AS ENUM ('FOREX_PAIR', 'INDEX_CFD', 'METAL_CFD', 'METAL_FUT', 'CRYPTO_SPOT', 'CRYPTO_PERP', 'INDEX_FUT', 'EQUITY_CFD', 'EQUITY_SPOT');

-- CreateEnum
CREATE TYPE "ReviewCycle" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('WATCHING', 'ALERTED', 'TRIGGERED', 'EXECUTED', 'MISSED', 'EXPIRED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "signal_log_ai_analyses" DROP CONSTRAINT "signal_log_ai_analyses_signalLogId_fkey";

-- DropForeignKey
ALTER TABLE "signal_logs" DROP CONSTRAINT "signal_logs_brokerAccountId_fkey";

-- DropForeignKey
ALTER TABLE "signal_logs" DROP CONSTRAINT "signal_logs_playbookId_fkey";

-- DropForeignKey
ALTER TABLE "signal_logs" DROP CONSTRAINT "signal_logs_userId_fkey";

-- DropTable
DROP TABLE "signal_log_ai_analyses";

-- DropTable
DROP TABLE "signal_logs";

-- CreateTable
CREATE TABLE "analysis_sessions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "brokerId" TEXT NOT NULL,
    "screenshotUrl" TEXT,
    "category" "IncomeCategory" NOT NULL,
    "assetClass" "AssetClass" NOT NULL,
    "marketVenue" "MarketVenue" NOT NULL,
    "instrumentSubtype" "InstrumentSubtype",
    "contract" JSONB,
    "leverage" INTEGER,
    "symbol" TEXT NOT NULL,
    "assetName" TEXT,
    "exchange" TEXT,
    "quote" JSONB,
    "platforms" JSONB,
    "htf" TEXT NOT NULL,
    "ltf" TEXT[],
    "directionalBias" "Direction" NOT NULL,
    "structureNotes" TEXT,
    "levels" JSONB,
    "triggers" JSONB,
    "invalidation" JSONB,
    "validityStartsAt" TIMESTAMP(3),
    "validityExpiresAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "invalidReason" TEXT,
    "reviewCycle" "ReviewCycle" NOT NULL,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'WATCHING',
    "attachments" JSONB,
    "tags" TEXT[],
    "activityLog" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "parentAnalysisId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analysis_sessions_userId_idx" ON "analysis_sessions"("userId");

-- CreateIndex
CREATE INDEX "analyses_userId_idx" ON "analyses"("userId");

-- CreateIndex
CREATE INDEX "analyses_sessionId_idx" ON "analyses"("sessionId");

-- CreateIndex
CREATE INDEX "analyses_brokerId_idx" ON "analyses"("brokerId");

-- CreateIndex
CREATE INDEX "analyses_parentAnalysisId_idx" ON "analyses"("parentAnalysisId");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_analysisId_key" ON "notifications"("analysisId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- AddForeignKey
ALTER TABLE "analysis_sessions" ADD CONSTRAINT "analysis_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "analysis_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "broker_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_parentAnalysisId_fkey" FOREIGN KEY ("parentAnalysisId") REFERENCES "analyses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
