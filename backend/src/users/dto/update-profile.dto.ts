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

  // Kullanici istegi: ayri bir "nickname gorunsun" parametresi yok -
  // avatar KAPALIYSA hem avatar hem nickname gizlenir, avatar
  // ACIKSA nickname alaninda (displayName) yazi varsa otomatik gorunur.
  @IsOptional()
  @IsBoolean()
  showAvatar?: boolean;

  // Kullanici istegi: acikken, mesaj/yanit gonderiminde hava durumu
  // otomatik eklenir.
  @IsOptional()
  @IsBoolean()
  alwaysAddWeather?: boolean;
}
