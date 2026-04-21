import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PdfService } from './pdf.service';

@Module({
  imports: [PrismaModule],
  controllers: [LeadsController],
  providers: [LeadsService, PdfService],
  exports: [LeadsService],
})
export class LeadsModule {}
