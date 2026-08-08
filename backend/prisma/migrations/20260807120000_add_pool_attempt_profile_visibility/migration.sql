-- Kullanici istegi: havuz sorularina verilen yanitlarin profil
-- sayfasindaki gorunurlugu (public/private). Idempotent - tekrar
-- calistirilirsa hata vermez.

ALTER TABLE "pool_attempts" ADD COLUMN IF NOT EXISTS "profile_visibility" TEXT NOT NULL DEFAULT 'private';
