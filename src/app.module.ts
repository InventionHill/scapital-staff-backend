import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './api/auth/auth.module';
import { BankingPartnersModule } from './api/banking-partners/banking-partners.module';
import { PlatformStatsModule } from './api/platform-stats/platform-stats.module';
import { LoanComparisonModule } from './api/loan-comparison/loan-comparison.module';
import { TestimonialsModule } from './api/testimonials/testimonials.module';
import { FaqsModule } from './api/faqs/faqs.module';
import { SectionContentModule } from './api/section-content/section-content.module';
import { LoanBannerModule } from './api/loan-banner/loan-banner.module';
import { FileUploadModule } from './api/file-upload/file-upload.module';
import { LoanApplicationsModule } from './api/loan-applications/loan-applications.module';
import { KeyDepartmentsModule } from './api/key-departments/key-departments.module';
import { EmployeeTestimonialsModule } from './api/employee-testimonials/employee-testimonials.module';
import { BlogsModule } from './api/blogs/blogs.module';
import { ContactInfoModule } from './api/contact-info/contact-info.module';
import { SocialLinksModule } from './api/social-links/social-links.module';
import { JobApplicationsModule } from './api/job-applications/job-applications.module';
import { CallsModule } from './api/calls/calls.module';
import { LeadsModule } from './api/leads/leads.module';
import { MobileDashboardModule } from './api/mobile-dashboard/mobile-dashboard.module';

@Module({
  imports: [
    LoggerModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    BankingPartnersModule,
    PlatformStatsModule,
    LoanComparisonModule,
    TestimonialsModule,
    FaqsModule,
    SectionContentModule,
    LoanBannerModule,
    FileUploadModule,
    LoanApplicationsModule,
    KeyDepartmentsModule,
    EmployeeTestimonialsModule,
    BlogsModule,
    ContactInfoModule,
    SocialLinksModule,
    JobApplicationsModule,
    CallsModule,
    LeadsModule,
    MobileDashboardModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
