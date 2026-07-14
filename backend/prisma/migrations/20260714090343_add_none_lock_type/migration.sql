-- AlterEnum
ALTER TYPE "ThreadLockType" ADD VALUE 'none';

-- AlterTable
ALTER TABLE "message_threads" ALTER COLUMN "lock_secret_hash" DROP NOT NULL;
