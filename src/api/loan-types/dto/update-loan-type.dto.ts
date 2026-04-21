import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class LoanDocumentDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateLoanTypeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoanDocumentDto)
  @IsOptional()
  documents?: LoanDocumentDto[];
}
