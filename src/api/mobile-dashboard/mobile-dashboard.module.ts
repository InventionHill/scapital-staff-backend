import { Module } from '@nestjs/common';
import { MobileDashboardService } from './mobile-dashboard.service';
import { MobileDashboardController } from './mobile-dashboard.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MobileDashboardController],
  providers: [MobileDashboardService],
})
export class MobileDashboardModule {}
