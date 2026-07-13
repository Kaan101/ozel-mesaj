import { IsInt, IsString, Min } from "class-validator";

export class UpdateSettingDto {
  @IsString()
  key: string;

  @IsInt()
  @Min(0)
  value: number;
}
