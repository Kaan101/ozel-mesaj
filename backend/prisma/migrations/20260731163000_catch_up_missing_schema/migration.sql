-- Kullanici istegi (KRITIK duzeltme): 20260718155016_add_push_subscriptions'dan
-- SONRA schema.prisma'ya eklenen COK SAYIDA alan/tablo/index icin hicbir
-- migration dosyasi yazilmamisti. Bu tek dosya, o eksik degisikliklerin
-- TAMAMINI kapsar.
--
-- REVIZE (2. deneme): "contacts"/"toxic_words" tablolari muhtemelen daha
-- ONCE (baska bir yolla, ornegin "db push" ile) OLUSTURULMUS ama BU
-- dosyanin varsaydigi TUM sutunlari icermiyor olabilir - bu yuzden
-- "CREATE TABLE IF NOT EXISTS" (hepsi ya da hicbiri) YETERSIZ kaliyordu.
-- Artik HER SUTUN AYRI AYRI, "IF NOT EXISTS" ile ekleniyor - tablo ONCEDEN
-- var olsun ya da olmasin, EKSIK sutunlar tamamlanir. Kisitlamalar (UNIQUE/
-- FK) da "zaten var" hatasini YAKALAYAN (EXCEPTION) bloklarla, isim
-- eslesmesine guvenmeden ekleniyor.

-- ========================================================
-- users tablosuna eksik sutunlar
-- ========================================================
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "show_avatar" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "block_all_messages" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "show_nickname" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "always_show_name" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "always_add_weather" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_config" JSONB;

-- ========================================================
-- messages tablosuna eksik sutunlar
-- ========================================================
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "weather_summary" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "moderation_status" TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "toxicity_score" INTEGER;

-- ========================================================
-- message_threads: kritik performans index'leri (Mesajlarim yavasligi)
-- ========================================================
CREATE INDEX IF NOT EXISTS "message_threads_initiator_user_id_idx" ON "message_threads"("initiator_user_id");
CREATE INDEX IF NOT EXISTS "message_threads_recipient_user_id_idx" ON "message_threads"("recipient_user_id");

-- ========================================================
-- Tablo: contacts (Rehber) - ONCEDEN var olabilir, bu yuzden once
-- BOS/MINIMAL halde garanti edilir, sonra HER SUTUN ayri ayri eklenir.
-- ========================================================
CREATE TABLE IF NOT EXISTS "contacts" (
    "id" UUID NOT NULL,
    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "owner_user_id" UUID;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "phone_number_hash" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "phone_number_encrypted" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "contact_avatar_id" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "contact_avatar_config" JSONB;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "contact_display_name" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Zorunlu alanlar icin NULL kalmis eski satirlar varsa (beklenmez ama
-- guvenlik icin), bos deger birakmamak adina bir varsayilan atanir -
-- sonra NOT NULL zorunlulugu eklenir.
UPDATE "contacts" SET "owner_user_id" = '00000000-0000-0000-0000-000000000000' WHERE "owner_user_id" IS NULL;
UPDATE "contacts" SET "phone_number_hash" = 'unknown-' || "id"::text WHERE "phone_number_hash" IS NULL;
UPDATE "contacts" SET "phone_number_encrypted" = '' WHERE "phone_number_encrypted" IS NULL;

DO $$ BEGIN
  ALTER TABLE "contacts" ALTER COLUMN "owner_user_id" SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "contacts" ALTER COLUMN "phone_number_hash" SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "contacts" ALTER COLUMN "phone_number_encrypted" SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

-- Kisitlamalar - "zaten var" hatasini yakalayan bloklarla, isim
-- eslesmesine guvenmeden.
DO $$ BEGIN
  ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_user_id_phone_number_hash_key"
    UNIQUE ("owner_user_id", "phone_number_hash");
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_user_id_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;

-- ========================================================
-- Tablo: toxic_words (Guardrail duzenlenebilir kelime listesi)
-- ========================================================
CREATE TABLE IF NOT EXISTS "toxic_words" (
    "id" UUID NOT NULL,
    CONSTRAINT "toxic_words_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "toxic_words" ADD COLUMN IF NOT EXISTS "word" TEXT;
ALTER TABLE "toxic_words" ADD COLUMN IF NOT EXISTS "score" INTEGER;
ALTER TABLE "toxic_words" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "toxic_words" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "toxic_words" SET "score" = 0 WHERE "score" IS NULL;

DO $$ BEGIN
  ALTER TABLE "toxic_words" ALTER COLUMN "score" SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "toxic_words" ADD CONSTRAINT "toxic_words_word_key" UNIQUE ("word");
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
