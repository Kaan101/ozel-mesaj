import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { POOL_CATEGORIES } from "../pool-categories.constant";

export class CreatePoolEntryDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  question: string;

  @IsString()
  @MinLength(4, { message: "answer en az 4 karakter olmali (brute-force zorlugu icin)." })
  answer: string;

  @IsOptional()
  @IsIn(POOL_CATEGORIES, {
    message: `category su degerlerden biri olmali: ${POOL_CATEGORIES.join(", ")}`,
  })
  category?: string;

  @IsIn(["public", "unlisted"])
  visibility: "public" | "unlisted";
}
