-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "moderation_status" TEXT NOT NULL DEFAULT 'approved',
ADD COLUMN     "toxicity_score" INTEGER;
