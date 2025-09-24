-- AlterTable
ALTER TABLE "asset_specifications" ADD COLUMN     "quoteCurrency" TEXT NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "broker_accounts" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "leverage" INTEGER;
