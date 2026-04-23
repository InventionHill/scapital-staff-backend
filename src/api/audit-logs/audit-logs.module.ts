import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit-logs.service';

@Global()
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
