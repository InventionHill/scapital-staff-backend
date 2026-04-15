import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateContactInfoDto {
  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  workingHours: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  mapUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
