-- Kullanici istegi: bloklama GECMISI kalici olarak tutulur - "blocks"
-- tablosundaki kayit silinse bile bilgi kaybolmasin diye ayri bir
-- "block_logs" tablosu. Idempotent - tekrar calistirilirsa hata vermez.

CREATE TABLE IF NOT EXISTS "block_logs" (
    "id" UUID NOT NULL,
    "blocker_user_id" UUID NOT NULL,
    "blocked_user_id" UUID NOT NULL,
    "type" "BlockType" NOT NULL,
    "blocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unblocked_at" TIMESTAMP(3),

    CONSTRAINT "block_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "block_logs" ADD COLUMN IF NOT EXISTS "blocker_user_id" UUID;
ALTER TABLE "block_logs" ADD COLUMN IF NOT EXISTS "blocked_user_id" UUID;
ALTER TABLE "block_logs" ADD COLUMN IF NOT EXISTS "type" "BlockType";
ALTER TABLE "block_logs" ADD COLUMN IF NOT EXISTS "blocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "block_logs" ADD COLUMN IF NOT EXISTS "unblocked_at" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "block_logs" ADD CONSTRAINT "block_logs_blocker_user_id_fkey"
    FOREIGN KEY ("blocker_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "block_logs" ADD CONSTRAINT "block_logs_blocked_user_id_fkey"
    FOREIGN KEY ("blocked_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
