import { PartialType } from '@nestjs/mapped-types';
import { CreateLoanBannerDto } from './create-loan-banner.dto';

export class UpdateLoanBannerDto extends PartialType(CreateLoanBannerDto) {}
