import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

const STATUS_VALUES = ["pending", "in_progress", "completed", "cancelled"] as const;
const PRIORITY_VALUES = ["low", "medium", "high"] as const;

export class CreateAdminTaskDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: (typeof STATUS_VALUES)[number];

  @IsOptional()
  @IsIn(PRIORITY_VALUES)
  priority?: (typeof PRIORITY_VALUES)[number];

  @IsOptional()
  @IsString()
  dueDate?: string;
}

export class UpdateAdminTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: (typeof STATUS_VALUES)[number];

  @IsOptional()
  @IsIn(PRIORITY_VALUES)
  priority?: (typeof PRIORITY_VALUES)[number];

  @IsOptional()
  @IsString()
  dueDate?: string;
}
