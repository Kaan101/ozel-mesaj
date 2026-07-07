-- CreateEnum
CREATE TYPE "PoolVisibility" AS ENUM ('public', 'unlisted');

-- CreateTable
CREATE TABLE "pool_entries" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "answer_hash" TEXT NOT NULL,
    "category" TEXT,
    "visibility" "PoolVisibility" NOT NULL DEFAULT 'public',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pool_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pool_entries" ADD CONSTRAINT "pool_entries_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
