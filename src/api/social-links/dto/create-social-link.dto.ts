import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateSocialLinkDto {
  @IsString()
  platform: string;

  @IsString()
  @IsUrl()
  url: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
