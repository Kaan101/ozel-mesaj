-- Kullanici istegi: sabit bir resim setinden secilip gonderilen
-- mesajlar - resmin dosya adini saklayan sutun. Idempotent - tekrar
-- calistirilirsa hata vermez.

ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "image_key" TEXT;
