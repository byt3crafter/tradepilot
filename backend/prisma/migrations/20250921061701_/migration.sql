-- CreateTable
CREATE TABLE "TradingObjective" (
    "id" TEXT NOT NULL,
    "profitTarget" DOUBLE PRECISION,
    "minTradingDays" INTEGER,
    "maxLoss" DOUBLE PRECISION,
    "maxDailyLoss" DOUBLE PRECISION,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brokerAccountId" TEXT NOT NULL,

    CONSTRAINT "SmartLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradingObjective_brokerAccountId_key" ON "TradingObjective"("brokerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SmartLimit_brokerAccountId_key" ON "SmartLimit"("brokerAccountId");

-- AddForeignKey
ALTER TABLE "TradingObjective" ADD CONSTRAINT "TradingObjective_brokerAccountId_fkey" FOREIGN KEY ("brokerAccountId") REFERENCES "BrokerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartLimit" ADD CONSTRAINT "SmartLimit_brokerAccountId_fkey" FOREIGN KEY ("brokerAccountId") REFERENCES "BrokerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
