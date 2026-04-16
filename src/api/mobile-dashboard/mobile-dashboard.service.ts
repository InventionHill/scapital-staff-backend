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

    // 1. Fetch Stats
    const [totalLeads, followUps, completed, todayCalls, todayFollowUpCount] =
      await Promise.all([
        // Total Leads assigned to this user OR unassigned
        this.prisma.lead.count({
          where: {
            OR: [{ assignedToId: user.id }, { assignedToId: null }],
          },
        }),
        // Leads with FOLLOW_UP status
        this.prisma.lead.count({
          where: {
            OR: [{ assignedToId: user.id }, { assignedToId: null }],
            status: 'FOLLOW_UP',
          },
        }),
        // Leads with COMPLETED status
        this.prisma.lead.count({
          where: {
            OR: [{ assignedToId: user.id }, { assignedToId: null }],
            status: 'COMPLETED',
          },
        }),
        // Calls made today by this user
        this.prisma.callLog.count({
          where: {
            callerId: user.id,
            createdAt: { gte: todayStart, lte: todayEnd },
          },
        }),
        // Follow-ups scheduled for Today
        this.prisma.lead.count({
          where: {
            OR: [{ assignedToId: user.id }, { assignedToId: null }],
            status: 'FOLLOW_UP',
            nextFollowUpAt: { gte: todayStart, lte: todayEnd },
          },
        }),
      ]);

    // 2. Fetch All Follow-up Tasks assigned to this user OR unassigned (Top 10)
    const rawFollowUpTasks = await this.prisma.lead.findMany({
      where: {
        OR: [{ assignedToId: user.id }, { assignedToId: null }],
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
        summary: `You have ${todayFollowUpCount} follow-ups today.`,
        privacyPolicyUrl: 'https://scapital.in/privacy-policy',
        termsConditionUrl: 'https://scapital.in/terms',
        userNumber: user.mobileNumber || 'N/A',
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
