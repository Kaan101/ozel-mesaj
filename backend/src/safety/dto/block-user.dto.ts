import { IsString, Matches } from "class-validator";

export class BlockUserDto {
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: "Telefon numarasi gecerli formatta degil (orn: +905551234567)",
  })
  phoneNumber: string;
}
