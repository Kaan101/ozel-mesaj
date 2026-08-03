import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  body: string;

  // Kullanici istegi: anonimlik artik mesaj bazinda secilmiyor,
  // /ayarlar'daki "profil ismimi goster" tercihinden TURETILIYOR -
  // bu yuzden opsiyonel: gonderilmezse backend kullanicinin kendi
  // tercihine bakar.
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

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

  // Kullanici istegi: sabit bir "yuz/resim" setinden secilip
  // gonderilen mesajlar - secilen resmin dosya adi (orn. "happy.png").
  @IsOptional()
  @IsString()
  imageKey?: string;
}
