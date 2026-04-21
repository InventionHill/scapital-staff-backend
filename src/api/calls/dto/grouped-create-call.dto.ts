import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NestedCallDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  time?: string;

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
  callerId?: string;

  @IsString()
  @IsOptional()
  name?: string;
}

export class GroupedCreateCallDto {
  @IsString()
  @IsNotEmpty()
  mobileId: string;

  @IsString()
  @IsOptional()
  mobileName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedCallDto)
  calls: NestedCallDto[];
}
