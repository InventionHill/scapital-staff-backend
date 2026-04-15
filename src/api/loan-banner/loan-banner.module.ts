import { Module } from '@nestjs/common';
import { LoanBannerService } from './loan-banner.service';
import { LoanBannerController } from './loan-banner.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LoanBannerController],
  providers: [LoanBannerService],
})
export class LoanBannerModule {}
