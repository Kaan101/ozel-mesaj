import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

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

  // Kullanici istegi: acikken, mesaj formlarindaki "anonim kal"
  // secenegi hic gosterilmez - kullanici her zaman adiyla gorunur.
  @IsOptional()
  @IsBoolean()
  alwaysShowName?: boolean;
}
