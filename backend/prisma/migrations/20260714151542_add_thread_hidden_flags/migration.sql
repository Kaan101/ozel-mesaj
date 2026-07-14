-- AlterTable
ALTER TABLE "message_threads" ADD COLUMN     "hidden_by_initiator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hidden_by_recipient" BOOLEAN NOT NULL DEFAULT false;
