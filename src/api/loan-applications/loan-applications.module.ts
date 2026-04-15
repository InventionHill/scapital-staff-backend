import { Module } from '@nestjs/common';
import { LoanApplicationsService } from './loan-applications.service';
import { LoanApplicationsController } from './loan-applications.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LoanApplicationsController],
  providers: [LoanApplicationsService],
})
export class LoanApplicationsModule {}
