import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

const AVATAR_IDS = [
  "genc-kiz",
  "genc-erkek",
  "erkek",
  "kadin",
  "cok-sacli-erkek",
  "kivircik-kadin",
  "kivircik-erkek",
  "duz-sacli-kadin",
  "olgun-erkek",
  "olgun-kadin",
] as const;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsIn(AVATAR_IDS)
  avatarId?: string;

  // Kullanici istegi: zengin ozellestirilebilir avatar (DiceBear) -
  // tum secimleri iceren JSON nesnesi.
  @IsOptional()
  @IsObject()
  avatarConfig?: Record<string, unknown>;

  // Kullanici istegi: avatar ve nickname gorunurlugu AYRI AYRI
  // kontrol edilir - mesaj bazinda secim yok, sadece bu ayar gecerli.
  @IsOptional()
  @IsBoolean()
  showAvatar?: boolean;

  @IsOptional()
  @IsBoolean()
  showNickname?: boolean;

  // Kullanici istegi: acikken, mesaj/yanit gonderiminde hava durumu
  // otomatik eklenir.
  @IsOptional()
  @IsBoolean()
  alwaysAddWeather?: boolean;
}
