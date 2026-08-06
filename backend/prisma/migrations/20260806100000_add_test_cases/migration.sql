-- Kullanici istegi: ayri (admin disi) bir test takip ekrani icin -
-- test senaryolarini, durumlarini ve guncelleyen kisiyi tutan tablo.
-- Idempotent - tekrar calistirilirsa hata vermez.

CREATE TABLE IF NOT EXISTS "test_cases" (
    "id" UUID NOT NULL,
    "no" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "expected_result" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Test Edilmedi',
    "note" TEXT,
    "last_updated_by" TEXT,
    "last_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "test_cases" ADD COLUMN IF NOT EXISTS "no" INTEGER;
ALTER TABLE "test_cases" ADD COLUMN IF NOT EXISTS "section" TEXT;
ALTER TABLE "test_cases" ADD COLUMN IF NOT EXISTS "scenario" TEXT;
ALTER TABLE "test_cases" ADD COLUMN IF NOT EXISTS "expected_result" TEXT;
ALTER TABLE "test_cases" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'Test Edilmedi';
ALTER TABLE "test_cases" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "test_cases" ADD COLUMN IF NOT EXISTS "last_updated_by" TEXT;
ALTER TABLE "test_cases" ADD COLUMN IF NOT EXISTS "last_updated_at" TIMESTAMP(3);
ALTER TABLE "test_cases" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
