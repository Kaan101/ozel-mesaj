-- Kullanici istegi: admin, sikayet listesinde olmayan bir kisiyi de
-- telefon numarasiyla elle bloke edebilsin - bu blok turu icin
-- "BlockType" enum'ina yeni bir deger eklenir. PostgreSQL 12+'ta
-- ALTER TYPE ... ADD VALUE bir transaction icinde calisabilir (ayni
-- transaction icinde bu degeri KULLANMADIGIMIZ surece), bu yuzden
-- bu migration TEK BASINA, guvenle calisir.

ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'admin_manual';
