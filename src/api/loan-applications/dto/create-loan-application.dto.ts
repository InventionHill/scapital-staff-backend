import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class CreateLoanApplicationDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ValidateIf(
    (o) => o.email !== '' && o.email !== null && o.email !== undefined,
  )
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  loanType: string;

  @IsString()
  @IsNotEmpty()
  loanAmount: string;

  @IsString()
  @IsNotEmpty()
  tenure: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];
}
