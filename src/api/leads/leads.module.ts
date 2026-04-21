import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PdfService } from './pdf.service';

import { ConfigModule } from '@nestjs/config';
import { S3Service } from './s3.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [LeadsController],
  providers: [LeadsService, PdfService, S3Service],
  exports: [LeadsService, S3Service],
})
export class LeadsModule {}
