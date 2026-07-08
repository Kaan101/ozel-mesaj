import { IsString, Matches } from "class-validator";

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: "Telefon numarasi gecerli formatta degil (orn: +905551234567)",
  })
  phoneNumber: string;

  @IsString()
  @Matches(/^[0-9]{4,6}$/, { message: "Kod 4-6 haneli rakamlardan olusmali" })
  code: string;
}
