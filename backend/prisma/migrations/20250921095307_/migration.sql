-- AlterTable
ALTER TABLE "users" ADD COLUMN     "proAccessExpiresAt" TIMESTAMP(3),
ADD COLUMN     "proAccessReason" TEXT;
