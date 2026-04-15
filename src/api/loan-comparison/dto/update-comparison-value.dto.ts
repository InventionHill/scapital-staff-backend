import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateComparisonValueDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  parameterId: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}
