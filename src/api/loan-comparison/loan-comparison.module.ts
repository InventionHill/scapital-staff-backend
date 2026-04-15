import { Module } from '@nestjs/common';
import { LoanComparisonService } from './loan-comparison.service';
import { LoanComparisonController } from './loan-comparison.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LoanComparisonController],
  providers: [LoanComparisonService],
})
export class LoanComparisonModule {}
