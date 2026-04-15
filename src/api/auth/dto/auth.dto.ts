import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character',
    },
  )
  password: string;
}

export class AppLoginDto {
  @IsString()
  @IsNotEmpty()
  number: string;

  @IsString()
  @IsOptional()
  organizationId?: string;
}

export class SignupDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character',
    },
  )
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  planId?: string;

  @IsString()
  @IsOptional()
  @IsIn(['PAID', 'TRIAL'])
  planType?: 'PAID' | 'TRIAL';
}

export class ResendOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ForgotDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class ResetDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}
