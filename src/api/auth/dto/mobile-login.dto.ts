import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class MobileLoginDto {
  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
