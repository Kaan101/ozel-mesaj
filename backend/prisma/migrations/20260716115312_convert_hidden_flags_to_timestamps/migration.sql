/*
  Warnings:

  - You are about to drop the column `hidden_by_initiator` on the `message_threads` table. All the data in the column will be lost.
  - You are about to drop the column `hidden_by_recipient` on the `message_threads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "message_threads" DROP COLUMN "hidden_by_initiator",
DROP COLUMN "hidden_by_recipient",
ADD COLUMN     "hidden_by_initiator_at" TIMESTAMP(3),
ADD COLUMN     "hidden_by_recipient_at" TIMESTAMP(3);
