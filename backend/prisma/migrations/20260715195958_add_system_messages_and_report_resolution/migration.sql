-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_user_id_fkey";

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "is_system_message" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "sender_user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "resolution_note" TEXT;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
