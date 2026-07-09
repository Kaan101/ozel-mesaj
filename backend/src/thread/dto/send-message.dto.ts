import { IsBoolean, IsString, MinLength } from "class-validator";

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  body: string;

  @IsBoolean()
  isAnonymous: boolean;
}
