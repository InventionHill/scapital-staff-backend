import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
} from 'class-validator';
export enum LeadStatus {
  NEW = 'NEW',
  FOLLOW_UP = 'FOLLOW_UP',
  COMPLETED = 'COMPLETED',
  NOT_INTERESTED = 'NOT_INTERESTED',
  NO_ANSWER = 'NO_ANSWER',
  CLOSED = 'CLOSED',
  INVALID_WRONG = 'INVALID_WRONG',
  INTERESTED = 'INTERESTED',
  RECALL = 'RECALL',
  LOGIN = 'LOGIN',
  SANCTIONED = 'SANCTIONED',
  DISBURSEMENT = 'DISBURSEMENT',
  REJECT = 'REJECT',
  DORMANT = 'DORMANT',
}

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
