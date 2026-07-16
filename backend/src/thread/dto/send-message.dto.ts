import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

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
}
