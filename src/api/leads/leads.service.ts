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

    // Ownership check (bypass for all admin roles)
    if (user?.userType !== 'ADMIN' && user?.role !== 'ADMIN') {
      if (lead.assignedToId !== user.id && lead.assignedToId !== null) {
        throw new ForbiddenException(
          'You do not have permission to update this lead',
        );
      }

      // CLOSED status restriction
      if (lead.status === 'CLOSED') {
        throw new ForbiddenException(
          'Only administrators can modify a closed lead',
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

      if (
        !newAssignedToId &&
        user?.userType !== 'ADMIN' &&
        user?.role !== 'ADMIN' &&
        user?.id
      ) {
        newAssignedToId = user.id;
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
        },
        include: {
          assignedTo: {
            select: { id: true, name: true, username: true },
          },
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
        adminId:
          user?.userType === 'ADMIN' || user?.role === 'ADMIN'
            ? user.id
            : undefined,
        callerId:
          user?.userType === 'MOBILE' || (user?.role && user.role !== 'ADMIN')
            ? user.id
            : undefined,
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

    // Filter by assignedToId for mobile users
    if (user?.userType === 'MOBILE') {
      baseCallWhere.callerId = user.id;
      baseLeadWhere.assignedToId = user.id;
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
            createdAt: { gte: d, lt: nextD },
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
  ) {
    const where: any = status ? { status } : {};

    // Data isolation for mobile users
    if (user?.userType === 'MOBILE') {
      where.OR = [{ assignedToId: user.id }, { assignedToId: null }];
    } else if (assignedToId) {
      // Admin can filter by assignedToId
      if (assignedToId === 'unassigned') {
        where.assignedToId = null;
      } else {
        where.assignedToId = assignedToId;
      }
    }

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

    // Ownership check (bypass for all admin roles)
    if (user?.userType !== 'ADMIN' && user?.role !== 'ADMIN') {
      if (lead.assignedToId !== user.id && lead.assignedToId !== null) {
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
