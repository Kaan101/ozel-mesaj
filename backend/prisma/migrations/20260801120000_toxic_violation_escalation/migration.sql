-- Kullanici istegi: Guardrail - kademeli toksisite cezasi sistemi
-- (inceleme altina alma + kademeli blok suresi). Onceki migration
-- deneyiminden ders alinarak, TAMAMEN idempotent (IF NOT EXISTS /
-- EXCEPTION yakalayan) sekilde yazildi - tekrar tekrar guvenle
-- calistirilabilir.

-- ========================================================
-- users tablosuna eksik sutunlar
-- ========================================================
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "toxic_violation_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_under_review" BOOLEAN NOT NULL DEFAULT false;

-- ========================================================
-- blocks tablosuna eksik sutun (kademeli blok suresi)
-- ========================================================
ALTER TABLE "blocks" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
