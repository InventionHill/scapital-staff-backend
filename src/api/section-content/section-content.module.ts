import { Module } from '@nestjs/common';
import { SectionContentService } from './section-content.service';
import { SectionContentController } from './section-content.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SectionContentController],
  providers: [SectionContentService],
})
export class SectionContentModule {}
