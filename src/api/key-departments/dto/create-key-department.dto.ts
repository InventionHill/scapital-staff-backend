import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateKeyDepartmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  experience: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
