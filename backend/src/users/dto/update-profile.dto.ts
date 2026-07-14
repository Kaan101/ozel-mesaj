import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsIn(["genc-erkek", "genc-kiz", "yetiskin-kadin", "yetiskin-erkek"])
  avatarAgeGender?: string;

  @IsOptional()
  @IsIn(["kisa", "uzun"])
  avatarHairLength?: string;

  @IsOptional()
  @IsBoolean()
  avatarHasGlasses?: boolean;
}
