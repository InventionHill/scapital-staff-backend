import { IsBoolean, IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateSectionContentDto {
  @IsString()
  @IsOptional()
  heading?: string;

  @IsString()
  @IsOptional()
  highlightedText?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  extraConfig?: Record<string, any>;
}
