-- Kullanici istegi: blok kayitlarina TIP eklendi - "manual" (kisi
-- bizzat bloke etti), "toxic_pending" (sistem otomatik bloke etti,
-- henuz onaylanmadi), "toxic_confirmed" (admin "Sorun Var" ile
-- onayladi). Idempotent - tekrar calistirilirsa hata vermez.

DO $$ BEGIN
    CREATE TYPE "BlockType" AS ENUM ('manual', 'toxic_pending', 'toxic_confirmed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "blocks" ADD COLUMN IF NOT EXISTS "type" "BlockType" NOT NULL DEFAULT 'manual';
