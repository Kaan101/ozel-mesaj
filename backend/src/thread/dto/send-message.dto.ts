import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  body: string;

  @IsBoolean()
  isAnonymous: boolean;

  // Kullanici istegi: her yanit icin de ayri ayri secilebilir.
  @IsOptional()
  @IsBoolean()
  destroyAfterRead?: boolean;

  // Kullanici istegi: mesaj yazarken anlik hava durumu ozeti (opsiyonel,
  // kisa metin - konum koordinati backend'e hic gonderilmez).
  @IsOptional()
  @IsString()
  @MaxLength(60)
  weatherSummary?: string;
}
