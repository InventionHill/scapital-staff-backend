import { Module } from '@nestjs/common';
import { KeyDepartmentsService } from './key-departments.service';
import { KeyDepartmentsController } from './key-departments.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [KeyDepartmentsController],
  providers: [KeyDepartmentsService],
})
export class KeyDepartmentsModule {}
