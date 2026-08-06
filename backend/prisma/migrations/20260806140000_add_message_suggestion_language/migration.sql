-- Kullanici istegi: mesaj onerileri artik DILE (tr/en) gore
-- ayriliyor - mevcut kayitlar varsayilan olarak "tr" sayilir.
-- Idempotent - tekrar calistirilirsa hata vermez.

ALTER TABLE "message_suggestions" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'tr';
