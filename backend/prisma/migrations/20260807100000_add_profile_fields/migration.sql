-- Kullanici istegi: mesajlastigin kisinin avatarina tiklayinca acilan
-- kisisellestirilmis profil sayfasi - kullanici bilgi kalemleri
-- (etiket+deger), her biri public/private olarak isaretlenebilir.
-- Idempotent - tekrar calistirilirsa hata vermez.

CREATE TABLE IF NOT EXISTS "profile_fields" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_fields_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "profile_fields" ADD COLUMN IF NOT EXISTS "user_id" UUID;
ALTER TABLE "profile_fields" ADD COLUMN IF NOT EXISTS "label" TEXT;
ALTER TABLE "profile_fields" ADD COLUMN IF NOT EXISTS "value" TEXT;
ALTER TABLE "profile_fields" ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'private';
ALTER TABLE "profile_fields" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "profile_fields" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "profile_fields" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$ BEGIN
  ALTER TABLE "profile_fields" ADD CONSTRAINT "profile_fields_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
