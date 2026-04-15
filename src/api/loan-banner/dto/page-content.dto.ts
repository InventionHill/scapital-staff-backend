import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ComparisonItemDto, RateItemDto } from './create-loan-banner.dto';

// A generic item DTO that covers fields from all possible sub-items (benefits, steps, comparison, etc.)
// to avoid validation errors when "items" array contains mixed types.
export class PageContentSubItemDto {
  // Benefit / Document / Step fields
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  // Comparison fields
  @IsString()
  @IsOptional()
  feature?: string;

  @IsString()
  @IsOptional()
  scapital?: string;

  @IsString()
  @IsOptional()
  banks?: string;

  @IsString()
  @IsOptional()
  nbfcs?: string;

  // Rate fields
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  value?: string;
}

// Union DTO to handle all possible fields for a section
export class PageContentItemDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsBoolean()
  isActive: boolean;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  titleHighlight?: string;

  @IsString()
  @IsOptional()
  highlight?: string; // Sometimes used instead of titleHighlight

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  buttonLabel?: string;

  // Nested Items - mapped to generic sub-item DTO
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PageContentSubItemDto)
  items?: PageContentSubItemDto[];

  // Specialized Tables
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RateItemDto)
  charges?: RateItemDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ComparisonItemDto)
  table?: ComparisonItemDto[];
}
