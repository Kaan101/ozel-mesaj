-- Kullanici istegi: blok nedeni artik KOD olarak tutuluyor, ve
-- sistem genelinde kullanilan kod tanimlari icin genel amacli bir
-- tablo. Idempotent - tekrar calistirilirsa hata vermez.

CREATE TABLE IF NOT EXISTS "system_codes" (
    "id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_codes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "system_codes" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "system_codes" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "system_codes" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "system_codes" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "system_codes" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$ BEGIN
  ALTER TABLE "system_codes" ADD CONSTRAINT "system_codes_category_code_key" UNIQUE ("category", "code");
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;

ALTER TABLE "blocks" ADD COLUMN IF NOT EXISTS "reason_code" TEXT;
