-- Drop the Analysis table and related enums
DROP TABLE IF EXISTS "Analysis" CASCADE;

-- Drop related enums
DROP TYPE IF EXISTS "IncomeCategory";
DROP TYPE IF EXISTS "AssetClass";
DROP TYPE IF EXISTS "MarketVenue";
DROP TYPE IF EXISTS "InstrumentSubtype";
DROP TYPE IF EXISTS "ReviewCycle";
DROP TYPE IF EXISTS "AnalysisStatus";

-- Remove analysisId column from Notification table
ALTER TABLE "Notification" DROP COLUMN IF EXISTS "analysisId";
