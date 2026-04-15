import { Module } from '@nestjs/common';
import { SocialLinksService } from './social-links.service';
import { SocialLinksController } from './social-links.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SocialLinksController],
  providers: [SocialLinksService],
})
export class SocialLinksModule {}
