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
import { LoanTypesModule } from './api/loan-types/loan-types.module';
import { BranchesModule } from './api/branches/branches.module';
import { DashboardModule } from './api/dashboard/dashboard.module';

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
    LoanTypesModule,
    BranchesModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
