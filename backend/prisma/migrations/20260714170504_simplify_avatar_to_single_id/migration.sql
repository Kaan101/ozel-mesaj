/*
  Warnings:

  - You are about to drop the column `avatar_age_gender` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_hair_length` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_has_glasses` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "avatar_age_gender",
DROP COLUMN "avatar_hair_length",
DROP COLUMN "avatar_has_glasses",
ADD COLUMN     "avatar_id" TEXT;
