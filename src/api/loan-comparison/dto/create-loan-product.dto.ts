import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateLoanProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  applyLabel?: string;

  @IsString()
  @IsOptional()
  applyUrl?: string;

  @IsString()
  @IsOptional()
  bankId?: string;

  @IsString()
  @IsOptional()
  interestRate?: string;

  @IsString()
  @IsOptional()
  processingFee?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  loanBannerId?: string;
}
