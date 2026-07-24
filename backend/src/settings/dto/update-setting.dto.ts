import { ValidateIf, IsString } from "class-validator";

// Kullanici istegi: sayisal parametrelerin yaninda, metin (string)
// parametreler de (orn. iletisim e-postasi, adres) desteklenir. Tur
// kontrolu burada gevsek tutulur - gercek deger, SettingsService
// icinde String(value) ile veritabanina yazilir.
export class UpdateSettingDto {
  @IsString()
  key: string;

  @ValidateIf(() => true)
  value: number | string;
}
