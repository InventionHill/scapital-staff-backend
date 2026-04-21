import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MobileDashboardService {
  constructor(private prisma: PrismaService) {}

  async getHomeData(user: any) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // MOBILE ID ISOLATION
    const baseWhere: any = {};
    if (user.userType === 'MOBILE') {
      // Get the admin for this branch, then filter by their allowed mobile IDs
      const branchAdmin = await this.prisma.adminUser.findFirst({
        where: { branchId: user.branchId },
      });

      if (!branchAdmin) {
        baseWhere.id = 'none'; // No admin = no leads
      } else {
        const allowedMobileIds = (branchAdmin.mobileIds as string[]) || [];
        baseWhere.AND = [
          {
            OR: [
              { mobileId: { in: allowedMobileIds } },
              { mobileId: null, branchId: user.branchId },
            ],
          },
          {
            OR: [{ assignedToId: user.id }, { assignedToId: null }],
          },
        ];
      }
    } else if (user.userType === 'ADMIN') {
      // Admin only sees leads whose mobileId is in their mobileIds array, plus manual leads
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: user.id },
      });
      const allowedIds = (admin?.mobileIds as string[]) || [];
      baseWhere.AND = [
        {
          OR: [
            { mobileId: { in: allowedIds } },
            { mobileId: null, branchId: user.branchId },
          ],
        },
      ];
    }

    // 1. Fetch Stats
    const [totalLeads, followUps, completed, todayCalls] = await Promise.all([
      // Total Leads
      this.prisma.lead.count({
        where: { ...baseWhere },
      }),
      // Leads with FOLLOW_UP status
      this.prisma.lead.count({
        where: {
          ...baseWhere,
          status: 'FOLLOW_UP',
        },
      }),
      // Leads with COMPLETED status
      this.prisma.lead.count({
        where: {
          ...baseWhere,
          status: 'COMPLETED',
        },
      }),
      // Calls made today (filtered by mobileId isolation)
      this.prisma.callLog.count({
        where: {
          ...(user.userType === 'MOBILE'
            ? { callerId: user.id }
            : { lead: { ...baseWhere } }),
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
    ]);

    // 2. Fetch All Follow-up Tasks (Top 10)
    const rawFollowUpTasks = await this.prisma.lead.findMany({
      where: {
        ...baseWhere,
        status: 'FOLLOW_UP',
      },
      orderBy: [
        { nextFollowUpAt: 'asc' }, // Prioritize by date
        { createdAt: 'desc' }, // Then by creation date
      ],
      take: 10,
    });

    // Format leads for display
    const followUpTasks = rawFollowUpTasks.map((lead) => ({
      id: lead.id,
      leadId: lead.serialId
        ? `LD-${String(lead.serialId).padStart(5, '0')}`
        : '----',
      name: lead.name || 'Anonymous Lead',
      phoneNumber: lead.phoneNumber,
      nextFollowUpAt: lead.nextFollowUpAt,
      priority: lead.priority,
    }));

    return {
      welcome: {
        name: user.name || user.username || 'User',
        summary: `You have ${followUps} pending follow-ups.`,
        privacyPolicyUrl: 'https://scapital.in/privacy-policy',
        termsConditionUrl: 'https://scapital.in/terms',
        userNumber: user.mobileNumber || 'N/A',
        branchName: user.branchName || user.branch?.name || 'N/A',
      },
      stats: {
        totalLeads,
        followUps,
        completed,
        todayCalls,
      },
      followUpTasks,
    };
  }
}
