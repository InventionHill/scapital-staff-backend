import { Module } from '@nestjs/common';
import { PlatformStatsService } from './platform-stats.service';
import { PlatformStatsController } from './platform-stats.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformStatsController],
  providers: [PlatformStatsService],
})
export class PlatformStatsModule {}
