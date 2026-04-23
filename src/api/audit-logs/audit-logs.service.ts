import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async createLog(
    actorId: string,
    actorType: 'ADMIN' | 'SUPER_ADMIN' | 'MOBILE' | 'SYSTEM',
    action: string,
    details: string,
    options?: {
      branchId?: string;
      targetId?: string;
      targetType?: string;
    },
  ) {
    try {
      let branchId = options?.branchId;

      // If branchId is not provided and it's an ADMIN or MOBILE, fetch it
      if (!branchId) {
        if (actorType === 'ADMIN') {
          const admin = await this.prisma.adminUser.findUnique({
            where: { id: actorId },
            select: { branchId: true },
          });
          branchId = admin?.branchId;
        } else if (actorType === 'MOBILE') {
          const mobile = await this.prisma.mobileUser.findUnique({
            where: { id: actorId },
            select: { branchId: true },
          });
          branchId = mobile?.branchId;
        }
      }

      return await this.prisma.auditLog.create({
        data: {
          actorId,
          actorType,
          branchId,
          action,
          details,
          targetId: options?.targetId,
          targetType: options?.targetType,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}
