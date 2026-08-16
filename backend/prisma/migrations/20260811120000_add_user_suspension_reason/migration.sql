-- Kullanici istegi: admin, bir hesabi elle askiya alirken (orn.
-- "Kotu Niyetli Kullanim") neden kodunu da kaydedebilsin. Idempotent -
-- tekrar calistirilirsa hata vermez. Yeni "8" (Kotu Niyetli Kullanim)
-- kod tanimi, uygulama basladiginda SystemCodesService tarafindan
-- otomatik eklenir (bkz. block-reason-codes.const.ts).

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspension_reason_code" TEXT;
