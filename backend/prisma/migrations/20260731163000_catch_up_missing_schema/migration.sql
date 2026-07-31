-- Kullanici istegi (KRITIK duzeltme): 20260718155016_add_push_subscriptions'dan
-- SONRA schema.prisma'ya eklenen COK SAYIDA alan/tablo/index icin hicbir
-- migration dosyasi yazilmamisti (Prisma CLI'nin "migrate dev" komutu, bu
-- degisiklikleri yapan oturumlarda gercek bir veritabanina karsi hic
-- calistirilmamis olmali). Bu tek dosya, o eksik degisikliklerin TAMAMINI
-- kapsar - "IF NOT EXISTS" / "DO $$ ... $$" bloklariyla, bu sutunlarin bir
-- kismi zaten (elle) eklenmis olsa bile GUVENLE tekrar calistirilabilir.

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
-- Yeni tablo: contacts (Rehber)
-- ========================================================
CREATE TABLE IF NOT EXISTS "contacts" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "phone_number_hash" TEXT NOT NULL,
    "phone_number_encrypted" TEXT NOT NULL,
    "note" TEXT,
    "contact_avatar_id" TEXT,
    "contact_avatar_config" JSONB,
    "contact_display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'contacts_owner_user_id_phone_number_hash_key'
    ) THEN
        ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_user_id_phone_number_hash_key"
            UNIQUE ("owner_user_id", "phone_number_hash");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'contacts_owner_user_id_fkey'
    ) THEN
        ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_user_id_fkey"
            FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- ========================================================
-- Yeni tablo: toxic_words (Guardrail duzenlenebilir kelime listesi)
-- ========================================================
CREATE TABLE IF NOT EXISTS "toxic_words" (
    "id" UUID NOT NULL,
    "word" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "toxic_words_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'toxic_words_word_key'
    ) THEN
        ALTER TABLE "toxic_words" ADD CONSTRAINT "toxic_words_word_key" UNIQUE ("word");
    END IF;
END $$;
