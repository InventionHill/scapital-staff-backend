import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  statusRemark?: string;

  @IsString()
  @IsOptional()
  assignedToId?: string;

  @IsDateString()
  @IsOptional()
  nextFollowUpAt?: string;

  @IsString()
  @IsOptional()
  loanTypeId?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  profile?: string;

  @IsString()
  @IsOptional()
  cibilStatus?: string;

  @IsString()
  @IsOptional()
  cibilRemark?: string;

  @IsString()
  @IsOptional()
  loanType?: string;

  @IsString()
  @IsOptional()
  customLoanType?: string;
}

export class AssignLeadDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
