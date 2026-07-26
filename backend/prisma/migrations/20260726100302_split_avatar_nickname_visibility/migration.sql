-- AlterTable
ALTER TABLE "users" ADD COLUMN     "show_avatar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_nickname" BOOLEAN NOT NULL DEFAULT false;
