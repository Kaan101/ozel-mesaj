-- Kullanici istegi: blok GECMISI (block_logs) tablosuna da neden
-- kodu eklenir - mevcut kayitlar backend basladiginda (SystemCodes
-- servisi) otomatik olarak TAHMINI degerle doldurulur. Idempotent -
-- tekrar calistirilirsa hata vermez.

ALTER TABLE "block_logs" ADD COLUMN IF NOT EXISTS "reason_code" TEXT;
