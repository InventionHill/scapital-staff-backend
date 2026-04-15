import { Module } from '@nestjs/common';
import { BankingPartnersService } from './banking-partners.service';
import { BankingPartnersController } from './banking-partners.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BankingPartnersController],
  providers: [BankingPartnersService],
})
export class BankingPartnersModule {}
