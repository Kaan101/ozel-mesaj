import { IsBoolean, IsIn, IsString, Matches, MinLength, ValidateIf } from "class-validator";

export class CreateThreadDto {
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: "Telefon numarasi gecerli formatta degil (orn: +905551234567)",
  })
  recipientPhone: string;

  @IsString()
  @MinLength(1)
  body: string;

  @IsIn(["password", "question"])
  lockType: "password" | "question";

  // Parola modunda: kilit ifadesinin kendisi.
  // Soru modunda: dogru cevap.
  @IsString()
  @MinLength(1)
  lockSecret: string;

  // Sadece lockType 'question' oldugunda zorunlu (Bolum 3, 7).
  @ValidateIf((o) => o.lockType === "question")
  @IsString()
  @MinLength(1, { message: "Soru modu secildiyse questionText zorunludur." })
  questionText?: string;

  @IsBoolean()
  isAnonymous: boolean;
}
