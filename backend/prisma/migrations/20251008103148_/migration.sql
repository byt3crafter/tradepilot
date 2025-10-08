-- AlterTable
ALTER TABLE "asset_specifications" ALTER COLUMN "valuePerPoint" DROP NOT NULL,
ALTER COLUMN "pipSize" DROP NOT NULL,
ALTER COLUMN "lotSize" DROP NOT NULL;

-- CreateTable
CREATE TABLE "signal_logs" (
    "id" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "screenshotUrl" TEXT NOT NULL,
    "quickThought" TEXT,
    "alertPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "brokerAccountId" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,

    CONSTRAINT "signal_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signal_log_ai_analyses" (
    "id" TEXT NOT NULL,
    "patternCheck" TEXT NOT NULL,
    "bestPlaybookMatch" JSONB NOT NULL,
    "considerations" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "signalLogId" TEXT NOT NULL,

    CONSTRAINT "signal_log_ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signal_logs_userId_idx" ON "signal_logs"("userId");

-- CreateIndex
CREATE INDEX "signal_logs_brokerAccountId_idx" ON "signal_logs"("brokerAccountId");

-- CreateIndex
CREATE INDEX "signal_logs_playbookId_idx" ON "signal_logs"("playbookId");

-- CreateIndex
CREATE UNIQUE INDEX "signal_log_ai_analyses_signalLogId_key" ON "signal_log_ai_analyses"("signalLogId");

-- AddForeignKey
ALTER TABLE "signal_logs" ADD CONSTRAINT "signal_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal_logs" ADD CONSTRAINT "signal_logs_brokerAccountId_fkey" FOREIGN KEY ("brokerAccountId") REFERENCES "broker_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal_logs" ADD CONSTRAINT "signal_logs_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "playbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal_log_ai_analyses" ADD CONSTRAINT "signal_log_ai_analyses_signalLogId_fkey" FOREIGN KEY ("signalLogId") REFERENCES "signal_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
