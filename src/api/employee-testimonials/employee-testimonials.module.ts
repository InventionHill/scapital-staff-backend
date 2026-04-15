import { Module } from '@nestjs/common';
import { EmployeeTestimonialsService } from './employee-testimonials.service';
import { EmployeeTestimonialsController } from './employee-testimonials.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmployeeTestimonialsController],
  providers: [EmployeeTestimonialsService],
})
export class EmployeeTestimonialsModule {}
