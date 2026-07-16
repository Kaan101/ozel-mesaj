-- CreateEnum
CREATE TYPE "PoolMatchMode" AS ENUM ('exact', 'review');

-- CreateEnum
CREATE TYPE "PoolAttemptStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- AlterTable
ALTER TABLE "pool_entries" ADD COLUMN     "match_mode" "PoolMatchMode" NOT NULL DEFAULT 'exact';

-- CreateTable
CREATE TABLE "pool_attempts" (
    "id" UUID NOT NULL,
    "pool_entry_id" UUID NOT NULL,
    "attempter_user_id" UUID NOT NULL,
    "answer_text" TEXT NOT NULL,
    "status" "PoolAttemptStatus" NOT NULL DEFAULT 'pending',
    "thread_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pool_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pool_attempts_pool_entry_id_idx" ON "pool_attempts"("pool_entry_id");

-- CreateIndex
CREATE INDEX "pool_attempts_attempter_user_id_idx" ON "pool_attempts"("attempter_user_id");

-- CreateIndex
CREATE INDEX "pool_attempts_status_idx" ON "pool_attempts"("status");

-- AddForeignKey
ALTER TABLE "pool_attempts" ADD CONSTRAINT "pool_attempts_pool_entry_id_fkey" FOREIGN KEY ("pool_entry_id") REFERENCES "pool_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_attempts" ADD CONSTRAINT "pool_attempts_attempter_user_id_fkey" FOREIGN KEY ("attempter_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
