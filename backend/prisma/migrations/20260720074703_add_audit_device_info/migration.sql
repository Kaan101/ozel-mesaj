-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "accept_language" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "screen_resolution" TEXT,
ADD COLUMN     "timezone" TEXT;
