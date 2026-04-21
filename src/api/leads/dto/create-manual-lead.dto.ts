import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateManualLeadDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  date?: string; // ISO date string e.g. "2026-04-20"

  @IsString()
  @IsOptional()
  time?: string; // e.g. "14:30"
  @IsString()
  @IsOptional()
  loanType?: string;

  @IsString()
  @IsOptional()
  customLoanType?: string;

  @IsString()
  @IsOptional()
  loanTypeId?: string;

  @IsString()
  @IsOptional()
  assignedToId?: string;
}
