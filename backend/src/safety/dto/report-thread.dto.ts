import { IsOptional, IsString } from "class-validator";

export class ReportThreadDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
