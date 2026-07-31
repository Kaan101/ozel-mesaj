-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "phone_number_hash" TEXT NOT NULL,
    "phone_number_encrypted" TEXT NOT NULL,
    "note" TEXT,
    "contact_avatar_id" TEXT,
    "contact_avatar_config" JSONB,
    "contact_display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contacts_owner_user_id_phone_number_hash_key" ON "contacts"("owner_user_id", "phone_number_hash");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
