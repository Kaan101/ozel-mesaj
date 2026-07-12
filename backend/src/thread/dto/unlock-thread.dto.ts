import { IsString, MinLength } from "class-validator";

export class UnlockThreadDto {
  @IsString()
  @MinLength(1)
  secret: string;
}
