import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateLeadStatusDto,
  AssignLeadDto,
} from './dto/update-lead-status.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  private formatLead(lead: any) {
    if (!lead) return lead;

    const callCount = lead._count?.callLogs || 0;
    let displayIcon = 'CALL';
    let displayStatusText = lead.status.replace('_', ' ');

    if (callCount === 0) {
      displayIcon = 'CALL';
    } else {
      displayIcon = 'PENDING';
    }

    if (lead.status === 'NEW') displayStatusText = 'New';
    else if (lead.status === 'FOLLOW_UP') displayStatusText = 'follow up';
    else if (lead.status === 'COMPLETED') displayStatusText = 'completed';
    else if (lead.status === 'NOT_INTERESTED')
      displayStatusText = 'not interested';
    else if (lead.status === 'NO_ANSWER') displayStatusText = 'no answer';
    else if (lead.status === 'CLOSED') displayStatusText = 'closed';
    else if (lead.status === 'INVALID_WRONG')
      displayStatusText = 'invalid/wrong';
    else if (lead.status === 'CALL_SUCCESS') displayStatusText = 'call success';
    else if (lead.status === 'RECALL') displayStatusText = 'Recall';
    else displayStatusText = lead.status.replace('_', ' ');

    return {
      ...lead,
      leadId: lead.serialId
        ? `LD-${String(lead.serialId).padStart(5, '0')}`
        : null,
      displayIcon,
      displayStatusText,
    };
  }

  async updateStatus(id: string, dto: UpdateLeadStatusDto, user?: any) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    // Ownership check (apply to all mobile users)
    if (user?.userType === 'MOBILE') {
      if (lead.assignedToId !== user.id && lead.assignedToId !== null) {
        throw new ForbiddenException(
          'This lead is already assigned to another mobile user',
        );
      }

      // CLOSED status restriction
      if (lead.status === 'CLOSED') {
        throw new ForbiddenException(
          'Only administrators can modify a closed lead',
        );
      }
    } else if (user?.userType === 'ADMIN' && user.role === 'ADMIN') {
      // Branch isolation for admins
      if (lead.branchId !== user.branchId) {
        throw new ForbiddenException(
          'You do not have permission to update leads outside your branch',
        );
      }
    }

    const finalStatus = dto.status;

    // Auto-calculate follow-up time if not provided
    const finalFollowUpAt = dto.nextFollowUpAt
      ? new Date(dto.nextFollowUpAt)
      : lead.nextFollowUpAt;

    let updatedLead;
    try {
      // Determine new assignment (auto-assign if unassigned and not an admin)
      let newAssignedToId =
        dto.assignedToId !== undefined
          ? dto.assignedToId === 'unassigned'
            ? null
            : dto.assignedToId
          : lead.assignedToId;

      if (!newAssignedToId && user?.userType === 'MOBILE' && user?.id) {
        newAssignedToId = user.id;
      }
      if (dto.loanTypeId && dto.loanTypeId !== 'unassigned') {
        let targetAdminId = user?.id;

        if (user?.userType === 'MOBILE') {
          const branchAdmin = await this.prisma.adminUser.findFirst({
            where: { branchId: user.branchId },
          });
          if (branchAdmin) {
            targetAdminId = branchAdmin.id;
          }
        }

        const lt = await this.prisma.loanType.findFirst({
          where: {
            id: dto.loanTypeId,
            createdBy: targetAdminId, // Context-aware isolation
          },
        });
        if (!lt) {
          throw new ForbiddenException(
            'You do not have permission to use this loan type or it does not exist',
          );
        }
      }

      // Update lead record
      updatedLead = await this.prisma.lead.update({
        where: { id },
        data: {
          status: finalStatus || lead.status,
          name: dto.name !== undefined ? dto.name : lead.name,
          phoneNumber:
            dto.phoneNumber !== undefined ? dto.phoneNumber : lead.phoneNumber,
          assignedToId: newAssignedToId,
          notes: dto.notes !== undefined ? dto.notes : lead.notes,
          nextFollowUpAt: finalFollowUpAt,
          loanTypeId:
            dto.loanTypeId !== undefined ? dto.loanTypeId : lead.loanTypeId,
        },
        include: {
          assignedTo: {
            select: { id: true, name: true, username: true },
          },
          loanType: true,
          _count: {
            select: { callLogs: true },
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Phone number already exists for another lead',
        );
      }
      throw error;
    }

    // Create a CallLog entry for the history timeline
    await this.prisma.callLog.create({
      data: {
        leadId: id,
        adminId: user?.userType === 'ADMIN' ? user.id : undefined,
        callerId: user?.userType === 'MOBILE' ? user.id : undefined,
        phoneNumber: dto.phoneNumber || lead.phoneNumber,
        callType: 'OUTGOING',
        outcome: finalStatus || lead.status,
        notes: dto.notes || undefined,
      },
    });

    return this.formatLead(updatedLead);
  }

  async getStats(user?: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseCallWhere: any = {
      leadId: { not: null },
    };

    const baseLeadWhere: any = {};

    // BRANCH & MOBILE ID ISOLATION
    if (user?.userType === 'MOBILE') {
      // 1. Get the admin for this branch
      const branchAdmin = await this.prisma.adminUser.findFirst({
        where: { branchId: user.branchId },
      });

      if (!branchAdmin) {
        baseLeadWhere.id = 'none';
      } else {
        const allowedMobileIds = (branchAdmin.mobileIds as string[]) || [];
        baseLeadWhere.mobileId = { in: allowedMobileIds };
        baseLeadWhere.OR = [{ assignedToId: user.id }, { assignedToId: null }];
      }
    } else if (user?.userType === 'ADMIN') {
      // 1. Get admin's allowed mobile IDs
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: user.id },
      });
      const allowedIds = (admin?.mobileIds as string[]) || [];
      baseLeadWhere.mobileId = { in: allowedIds };
      // For call logs, we want logs related to these leads
      baseCallWhere.lead = { mobileId: { in: allowedIds } };
    }

    let totalAdmins = 0;
    if (user?.userType === 'SUPER_ADMIN') {
      totalAdmins = await this.prisma.adminUser.count();
    }

    const [
      uniqueLeadsWithCalls,
      completed,
      followUp,
      noAnswer,
      closed,
      newLeadsCount,
      invalidLeadsCount,
      todayCallsCount,
      assignedLeadsCount,
    ] = await Promise.all([
      this.prisma.lead.count({
        where: { ...baseLeadWhere },
      }),
      this.prisma.lead.count({
        where: { ...baseLeadWhere, status: 'COMPLETED' },
      }),
      this.prisma.lead.count({
        where: { ...baseLeadWhere, status: 'FOLLOW_UP' },
      }),
      this.prisma.lead.count({
        where: { ...baseLeadWhere, status: 'NO_ANSWER' },
      }),
      this.prisma.lead.count({ where: { ...baseLeadWhere, status: 'CLOSED' } }),
      this.prisma.lead.count({ where: { ...baseLeadWhere, status: 'NEW' } }),
      this.prisma.lead.count({
        where: { ...baseLeadWhere, status: 'INVALID_WRONG' },
      }),
      this.prisma.lead.count({
        where: {
          ...baseLeadWhere,
          callLogs: { some: { createdAt: { gte: today } } },
        },
      }),
      this.prisma.lead.count({
        where: { ...baseLeadWhere, assignedToId: { not: null } },
      }),
    ]);

    const last7DaysTitles = [];
    const last7DaysPromises = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      last7DaysTitles.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      last7DaysPromises.push(
        this.prisma.lead.count({
          where: {
            ...baseLeadWhere,
            callLogs: { some: { createdAt: { gte: d, lt: nextD } } },
          },
        }),
      );
    }

    const last7DaysCounts = await Promise.all(last7DaysPromises);
    const last7DaysCalls = last7DaysTitles.map((name, index) => ({
      name,
      leads: last7DaysCounts[index],
    }));

    return {
      totalCalls: uniqueLeadsWithCalls,
      completedLeads: completed,
      followUpLeads: followUp,
      notAnsweredLeads: noAnswer,
      closedLeads: closed,
      invalidLeads: invalidLeadsCount,
      newLeads: newLeadsCount,
      todayCalls: todayCallsCount,
      assignedCalls: assignedLeadsCount,
      totalAdmins,
      last7DaysCalls,
    };
  }

  async assign(id: string, dto: AssignLeadDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    const newUserId =
      dto.userId === 'unassigned' || dto.userId === 'null' ? null : dto.userId;

    await this.prisma.callLog.updateMany({
      where: { leadId: id },
      data: { callerId: newUserId },
    });

    const updatedLead = await this.prisma.lead.update({
      where: { id },
      data: { assignedToId: newUserId },
      include: {
        assignedTo: {
          select: { id: true, name: true, username: true },
        },
        _count: {
          select: { callLogs: true },
        },
      },
    });

    return this.formatLead(updatedLead);
  }

  async findAll(
    user?: any,
    status?: any,
    startDate?: string,
    endDate?: string,
    assignedToId?: string,
    branchId?: string,
  ) {
    const where: any = status ? { status } : {};

    // Branch filtering from query (if provided)
    if (branchId) {
      where.branchId = branchId;
    }

    // Data isolation for role-based access
    if (user?.userType === 'MOBILE') {
      // 1. Get the admin for this branch
      const branchAdmin = await this.prisma.adminUser.findUnique({
        where: { branchId: user.branchId },
      });

      if (!branchAdmin) {
        // If no admin is assigned to this branch yet, mobile users see nothing
        where.id = 'none';
      } else {
        const allowedMobileIds = (branchAdmin.mobileIds as string[]) || [];
        where.mobileId = { in: allowedMobileIds };
        where.AND = [
          ...(where.AND || []),
          {
            OR: [{ assignedToId: user.id }, { assignedToId: null }],
          },
        ];
      }
    } else if (user?.userType === 'ADMIN' && user.role === 'ADMIN') {
      // 1. Get admin's allowed mobile IDs
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: user.id },
      });
      const allowedIds = (admin?.mobileIds as string[]) || [];
      where.mobileId = { in: allowedIds };
    }
    // SUPER_ADMIN sees everything unless they explicitly filter by branchId query

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const leads = await this.prisma.lead.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, username: true },
        },
        loanType: true,
        _count: {
          select: { callLogs: true },
        },
      },
    });

    // Custom sorting: RECALL leads first, then by serialId desc
    leads.sort((a, b) => {
      // Prioritize RECALL status
      if (a.status === 'RECALL' && b.status !== 'RECALL') return -1;
      if (a.status !== 'RECALL' && b.status === 'RECALL') return 1;

      // Secondary sort: serialId desc
      return (b.serialId || 0) - (a.serialId || 0);
    });

    return leads.map((lead) => this.formatLead(lead));
  }

  async findOne(id: string, user?: any) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, username: true },
        },
        loanType: true,
        _count: {
          select: { callLogs: true },
        },
        callLogs: {
          include: {
            caller: { select: { id: true, name: true } },
            admin: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    // BRANCH & MOBILE ID ISOLATION check (apply to both admin and mobile)
    if (user?.userType === 'MOBILE') {
      const branchAdmin = await this.prisma.adminUser.findUnique({
        where: { branchId: user.branchId },
      });

      const allowedMobileIds = (branchAdmin?.mobileIds as string[]) || [];
      if (!lead.mobileId || !allowedMobileIds.includes(lead.mobileId)) {
        throw new ForbiddenException(
          'You do not have permission to view this lead',
        );
      }

      // Assignment Isolation: Prevent mobile users from viewing leads assigned to others
      if (lead.assignedToId !== null && lead.assignedToId !== user.id) {
        throw new ForbiddenException(
          'This lead is already assigned to another mobile user',
        );
      }
    } else if (user?.userType === 'ADMIN' && user.role === 'ADMIN') {
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: user.id },
      });
      const allowedMobileIds = (admin?.mobileIds as string[]) || [];

      if (!lead.mobileId || !allowedMobileIds.includes(lead.mobileId)) {
        throw new ForbiddenException(
          'You do not have permission to view this lead',
        );
      }
    }

    return this.formatLead(lead);
  }

  async remove(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    // Delete associated call logs first or let Prisma handle via Cascade if configured
    // Given the current schema, we should check if they are deleted automatically
    await this.prisma.callLog.deleteMany({ where: { leadId: id } });

    return this.prisma.lead.delete({ where: { id } });
  }
}
