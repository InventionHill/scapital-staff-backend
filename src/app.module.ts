import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './api/auth/auth.module';
import { FileUploadModule } from './api/file-upload/file-upload.module';
import { CallsModule } from './api/calls/calls.module';
import { LeadsModule } from './api/leads/leads.module';
import { MobileDashboardModule } from './api/mobile-dashboard/mobile-dashboard.module';

@Module({
  imports: [
    LoggerModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    FileUploadModule,
    CallsModule,
    LeadsModule,
    MobileDashboardModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
