import { IsString, MinLength } from "class-validator";

export class AttemptPoolEntryDto {
  @IsString()
  @MinLength(1)
  answer: string;
}
