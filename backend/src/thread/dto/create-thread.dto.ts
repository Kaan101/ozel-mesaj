import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateThreadDto {
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: "Telefon numarasi gecerli formatta degil (orn: +905551234567)",
  })
  recipientPhone: string;

  // Kullanici istegi: opsiyonel ek bildirim kanali - alicinin giris
  // yontemini DEGISTIRMEZ (hala telefon/OTP ile giris yapar), sadece
  // gonderen isterse ek olarak bir e-postaya da bildirim gitsin diye.
  @IsOptional()
  @IsEmail({}, { message: "Gecerli bir e-posta adresi gir." })
  recipientNotificationEmail?: string;

  @IsString()
  @MinLength(1)
  body: string;

  // "none": alici zaten bilinen bir kisi oldugu icin (Ona Mesaj Gonder
  // akisinda) kilit zorunlu degil - kullanici geri bildirimi. "password"
  // geriye donuk uyumluluk icin backend'de hala destekleniyor (eski
  // kayitlar), ama frontend artik bu secenegi sunmuyor.
  @IsIn(["password", "question", "none"])
  lockType: "password" | "question" | "none";

  // "none" modunda gerekmez. Parola modunda: kilit ifadesinin kendisi.
  // Soru modunda: dogru cevap.
  @ValidateIf((o) => o.lockType !== "none")
  @IsString()
  @MinLength(1)
  lockSecret?: string;

  // Sadece lockType 'question' oldugunda zorunlu (Bolum 3, 7).
  @ValidateIf((o) => o.lockType === "question")
  @IsString()
  @MinLength(1, { message: "Soru modu secildiyse questionText zorunludur." })
  questionText?: string;

  @IsBoolean()
  isAnonymous: boolean;

  // Kullanici istegi: gonderen isterse mesaj okunduktan sonra
  // uygulamadan (canli tabloya) silinsin - ama hukuki ispat icin
  // sifreli arsiv kopyasi (MessageAudit) HER ZAMAN kalir, bu
  // secenekten etkilenmez.
  @IsOptional()
  @IsBoolean()
  destroyAfterRead?: boolean;

  // Kullanici istegi: mesaj yazarken anlik hava durumu ozeti (opsiyonel).
  @IsOptional()
  @IsString()
  @MaxLength(60)
  weatherSummary?: string;
}
