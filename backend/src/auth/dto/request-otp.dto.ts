import { Equals, IsString, Matches } from "class-validator";

export class RequestOtpDto {
  // Basit format kontrolu: + ile baslayan, 10-15 haneli bir numara.
  // Gercek E.164 dogrulamasi ileride gelistirilebilir.
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: "Telefon numarasi gecerli formatta degil (orn: +905551234567)",
  })
  phoneNumber: string;

  // Kullanici istegi: KVKK Aydinlatma Metni ve Acik Riza Metni
  // onaylanmadan giris islemine izin verilmemeli - backend seviyesinde
  // de zorunlu kilinir (sadece frontend kontrolu yeterli degil).
  @Equals(true, { message: "KVKK Aydinlatma Metni'ni onaylamalisiniz." })
  kvkkConsentAccepted: boolean;

  @Equals(true, { message: "Acik Riza Metni'ni onaylamalisiniz." })
  explicitConsentAccepted: boolean;
}
