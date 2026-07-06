-- CreateEnum
CREATE TYPE "ThreadOriginType" AS ENUM ('direct', 'pool');

-- CreateEnum
CREATE TYPE "ThreadLockType" AS ENUM ('password', 'question');

-- CreateTable
CREATE TABLE "message_threads" (
    "id" UUID NOT NULL,
    "origin_type" "ThreadOriginType" NOT NULL,
    "initiator_user_id" UUID NOT NULL,
    "recipient_user_id" UUID,
    "lock_type" "ThreadLockType" NOT NULL,
    "lock_secret_hash" TEXT NOT NULL,
    "question_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_initiator_user_id_fkey" FOREIGN KEY ("initiator_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
