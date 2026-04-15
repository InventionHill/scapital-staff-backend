import { PartialType } from '@nestjs/swagger';
import { CreateBankingPartnerDto } from './create-banking-partner.dto';

export class UpdateBankingPartnerDto extends PartialType(
  CreateBankingPartnerDto,
) {}
