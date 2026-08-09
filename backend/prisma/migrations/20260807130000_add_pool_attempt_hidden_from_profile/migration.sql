-- Kullanici istegi: yanit veren kisi, havuz soru-yanit ciftini KENDI
-- profil sayfasindan kaldirabilsin (havuzdaki asil yanit/thread
-- etkilenmez). Idempotent - tekrar calistirilirsa hata vermez.

ALTER TABLE "pool_attempts" ADD COLUMN IF NOT EXISTS "hidden_from_profile" BOOLEAN NOT NULL DEFAULT false;
