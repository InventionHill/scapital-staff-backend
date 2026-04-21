import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
} from 'class-validator';

export enum CallType {
  INCOMING = 'INCOMING',
  MISSED = 'MISSED',
}

export class CreateCallDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsEnum(CallType)
  @IsOptional()
  callType?: CallType = CallType.INCOMING;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  outcome?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsOptional()
  callerId?: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsString()
  @IsOptional()
  mobileId?: string;

  @IsString()
  @IsOptional()
  mobileName?: string;

  @IsString()
  @IsOptional()
  name?: string;
}
