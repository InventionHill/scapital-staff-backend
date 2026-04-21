import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsEmail,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LeadStatus } from '@prisma/client';

export class ApplicationReferenceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

export class UpdateLeadStatusDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;
}

export class CoApplicantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  motherName?: string;
}

export class CreateApplicationFormDto {
  @IsString()
  name: string;

  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  motherName?: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  fileNumber?: string;

  @IsOptional()
  @IsObject()
  addresses?: any;

  @IsOptional()
  @IsObject()
  financials?: any;

  @IsOptional()
  @IsString()
  product?: string;

  @IsOptional()
  @IsString()
  residentType?: string;

  @IsOptional()
  @IsString()
  leadBy?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationReferenceDto)
  references?: ApplicationReferenceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoApplicantDto)
  coApplicants?: CoApplicantDto[];
}
