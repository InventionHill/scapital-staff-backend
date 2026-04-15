import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PageContentItemDto } from './page-content.dto';

export class FeatureItemDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsBoolean()
  isActive: boolean;
}

export class CtaButtonDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsBoolean()
  enabled: boolean;
}

export class BenefitItemDto {
  @IsString()
  @IsOptional()
  icon: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class DocumentItemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  description: string;
}

export class RateItemDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

export class StepItemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class ComparisonItemDto {
  @IsString()
  @IsNotEmpty()
  feature: string;

  @IsString()
  @IsOptional()
  scapital?: string;

  @IsString()
  @IsOptional()
  banks?: string;

  @IsString()
  @IsOptional()
  nbfcs?: string;
}

export class CreateLoanBannerDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsString()
  @IsNotEmpty()
  heading: string;

  @IsString()
  @IsOptional()
  headingHighlight?: string;

  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  redirectUrl?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FeatureItemDto)
  features?: FeatureItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CtaButtonDto)
  ctaPrimary?: CtaButtonDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CtaButtonDto)
  ctaSecondary?: CtaButtonDto;

  // Overview Section
  @IsString()
  @IsOptional()
  overviewTitle?: string;

  @IsString()
  @IsOptional()
  overviewTitleHighlight?: string;

  @IsString()
  @IsOptional()
  overviewContent?: string;

  // Benefits Section
  @IsString()
  @IsOptional()
  benefitsTitle?: string;

  @IsString()
  @IsOptional()
  benefitsTitleHighlight?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BenefitItemDto)
  benefits?: BenefitItemDto[];

  // Documents Section
  @IsString()
  @IsOptional()
  documentsTitle?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DocumentItemDto)
  documents?: DocumentItemDto[];

  // Rates & Charges Section
  @IsString()
  @IsOptional()
  ratesTitle?: string;

  @IsString()
  @IsOptional()
  ratesTitleHighlight?: string;

  @IsString()
  @IsOptional()
  ratesImage?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RateItemDto)
  ratesTable?: RateItemDto[];

  // Steps Section
  @IsString()
  @IsOptional()
  stepsTitle?: string;

  @IsString()
  @IsOptional()
  stepsTitleHighlight?: string;

  @IsString()
  @IsOptional()
  stepsButtonLabel?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => StepItemDto)
  steps?: StepItemDto[];

  // Comparison Section
  @IsString()
  @IsOptional()
  comparisonTitle?: string;

  @IsString()
  @IsOptional()
  comparisonTitleHighlight?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ComparisonItemDto)
  comparisonTable?: ComparisonItemDto[];

  // Dynamic Page Content
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PageContentItemDto)
  pageContent?: PageContentItemDto[];

  // Calculator Configuration
  @IsNumber()
  @IsOptional()
  defaultAmount?: number;

  @IsNumber()
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @IsOptional()
  maxAmount?: number;

  @IsNumber()
  @IsOptional()
  defaultTenure?: number;

  @IsNumber()
  @IsOptional()
  minTenure?: number;

  @IsNumber()
  @IsOptional()
  maxTenure?: number;

  @IsNumber()
  @IsOptional()
  defaultInterest?: number;

  @IsNumber()
  @IsOptional()
  minInterest?: number;

  @IsNumber()
  @IsOptional()
  maxInterest?: number;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
