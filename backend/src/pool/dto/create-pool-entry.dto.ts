import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class CreatePoolEntryDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  question: string;

  @IsString()
  @MinLength(1)
  answer: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsIn(["public", "unlisted"])
  visibility: "public" | "unlisted";
}
