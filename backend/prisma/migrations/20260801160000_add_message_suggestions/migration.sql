-- Kullanici istegi: mesaj yazarken sunulan hazir oneriler artik
-- veritabaninda (admin duzenleyebilir). Idempotent - tekrar
-- calistirilirsa hata vermez.

CREATE TABLE IF NOT EXISTS "message_suggestions" (
    "id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_suggestions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "message_suggestions" ADD COLUMN IF NOT EXISTS "text" TEXT;
ALTER TABLE "message_suggestions" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "message_suggestions" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
