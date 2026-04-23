import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-logs/audit-logs.service';
import {
  UpdateLeadStatusDto,
  AssignLeadDto,
} from './dto/update-lead-status.dto';
import { CreateManualLeadDto } from './dto/create-manual-lead.dto';
import { ImportLeadsDto } from './dto/import-leads.dto';
import { CreateApplicationFormDto } from './dto/application-form.dto';
import { PdfService } from './pdf.service';
import { S3Service } from './s3.service';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  private prisma: any;

  constructor(
    prisma: PrismaService,
    private pdfService: PdfService,
    private configService: ConfigService,
    private s3Service: S3Service,
    private auditLog: AuditLogService,
  ) {
    this.prisma = prisma;
  }

  private async formatLead(lead: any, _user?: any) {
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
    else if (lead.status === 'COMPLETED') displayStatusText = 'Call Connected';
    else if (lead.status === 'FOLLOW_UP') displayStatusText = 'Follow Up';
    else if (lead.status === 'NOT_INTERESTED')
      displayStatusText = 'Not Interested';
    else if (lead.status === 'NO_ANSWER') displayStatusText = 'No Answer';
    else if (lead.status === 'CLOSED') displayStatusText = 'Closed';
    else if (lead.status === 'INVALID_WRONG')
      displayStatusText = 'Invalid/Wrong';
    else if (lead.status === 'INTERESTED') displayStatusText = 'Interested';
    else if (lead.status === 'RECALL') displayStatusText = 'Recall';
    else if (lead.status === 'LOGIN') displayStatusText = 'Login';
    else if (lead.status === 'SANCTIONED') displayStatusText = 'Sanctioned';
    else if (lead.status === 'DISBURSEMENT') displayStatusText = 'Disbursement';
    else if (lead.status === 'REJECT') displayStatusText = 'Reject';
    else if (lead.status === 'DORMANT') displayStatusText = 'Dormant';
    else displayStatusText = lead.status.replace('_', ' ');

    // Redaction logic for custom "Other" loan types
    // Visible ONLY to the specific mobile user who is assigned to the lead
    const customLoanType = lead.customLoanType || '';

    const formatted: any = {
      ...lead,
      customLoanType,
      leadId: lead.branchSerialId
        ? `LD-${String(lead.branchSerialId).padStart(5, '0')}`
        : lead.serialId
          ? `LD-${String(lead.serialId).padStart(5, '0')}`
          : null,
      displayIcon,
      displayStatusText,
      name: lead.name || '',
    };

    // Use the S3 Service to generate a secure presigned URL instead of a localhost proxy
    if (formatted.applicationForm && formatted.applicationForm.pdfUrl) {
      try {
        const fileName = `application_form_${formatted.id}.pdf`;
        const presignedUrl = await this.s3Service.getPresignedUrl(fileName);
        formatted.applicationForm.pdfUrl = presignedUrl;
        this.logger.log(
          `>> [DEBUG] S3 Presigned URL Generated: ${presignedUrl}`,
        );
      } catch (e) {
        this.logger.error(
          `Failed to generate presigned URL for ${formatted.id}`,
        );
      }
    }

    return formatted;
  }

  async getApplicationFormPdf(leadId: string): Promise<Buffer> {
    const lead = await (this.prisma as any).lead.findUnique({
      where: { id: leadId },
      include: { applicationForm: true },
    });

    if (!lead || !lead.applicationForm) {
      throw new NotFoundException('Application form not found');
    }

    // Try to fetch from S3 first to save CPU
    if (lead.applicationForm.pdfUrl) {
      try {
        const fileName = `application_form_${leadId}.pdf`;
        return await this.s3Service.downloadPdf(fileName);
      } catch (e) {
        this.logger.warn(`S3 Fetch failed, re-generating PDF: ${e.message}`);
      }
    }

    // Fallback to generation if not in S3
    return this.generateApplicationPdf(leadId);
  }

  async importLeads(dto: ImportLeadsDto, user: any) {
    const results = {
      imported: 0,
      newLeads: 0,
      updatedLeads: 0,
      skipped: 0,
      errors: [] as any[],
    };

    for (const leadDto of dto.leads) {
      try {
        // Determine branchId
        let branchId: string | null = leadDto.branchId || null;
        if (user?.userType === 'ADMIN' && user?.branchId) {
          branchId = user.branchId;
        } else if (user?.userType === 'SUPER_ADMIN' && leadDto.branchId) {
          branchId = leadDto.branchId;
        }

        // Check for duplicate phone number within the same branch
        const existing = await this.prisma.lead.findFirst({
          where: {
            phoneNumber: leadDto.phoneNumber,
            branchId: branchId,
          },
        });

        if (existing) {
          // If duplicate in same branch, update status to RECALL
          await this.prisma.lead.update({
            where: { id: existing.id },
            data: {
              status: 'RECALL',
              lastCallAt: new Date(),
              name: leadDto.name || existing.name, // Update name if provided
            },
          });
          results.imported++;
          results.updatedLeads++;
          continue;
        }

        await this.prisma.$transaction(async (tx: any) => {
          // Calculate branch-specific serial ID
          let branchSerialId = null;
          if (branchId) {
            const branch = await tx.branch.update({
              where: { id: branchId },
              data: { lastSerialNumber: { increment: 1 } },
              select: { lastSerialNumber: true },
            });
            branchSerialId = branch.lastSerialNumber;
          }

          // Create the lead
          await tx.lead.create({
            data: {
              phoneNumber: leadDto.phoneNumber,
              name: leadDto.name || null,
              status: 'NEW',
              branchId,
              branchSerialId,
              createdAt: new Date(),
              lastCallAt: new Date(),
              loanType: 'Other',
            },
          });
        });

        results.imported++;
        results.newLeads++;
      } catch (error) {
        this.logger.error(
          `Failed to import lead ${leadDto.phoneNumber}: ${error.message}`,
        );
        results.errors.push({
          phoneNumber: leadDto.phoneNumber,
          error: error.message,
        });
      }
    }

    if (user) {
      await this.auditLog.createLog(
        user.id,
        user.userType as any,
        'IMPORT_LEADS',
        `Imported ${results.imported} leads (Skipped: ${results.skipped}, Errors: ${results.errors.length})`,
        { targetType: 'LEAD' },
      );
    }

    return results;
  }

  async createManual(dto: CreateManualLeadDto, user: any) {
    // Determine branchId from user context or DTO
    let branchId: string | null = dto.branchId || null;
    if (user?.userType === 'ADMIN' && user?.branchId) {
      branchId = user.branchId;
    } else if (user?.userType === 'MOBILE' && user?.branchId) {
      branchId = user.branchId;
    } else if (user?.userType === 'SUPER_ADMIN' && dto.branchId) {
      branchId = dto.branchId;
    }

    // Check for duplicate phone number within the same branch
    const existing = await this.prisma.lead.findFirst({
      where: {
        phoneNumber: dto.phoneNumber,
        branchId: branchId,
      },
    });

    if (existing) {
      // If duplicate in same branch, update status to RECALL and return
      return this.prisma.lead.update({
        where: { id: existing.id },
        data: {
          status: 'RECALL',
          lastCallAt: new Date(),
          name: dto.name || existing.name,
        },
      });
    }

    // Build the createdAt timestamp from date + time fields
    let createdAt: Date | undefined;
    if (dto.date) {
      if (dto.time) {
        // Parse date and time together
        createdAt = new Date(`${dto.date}T${dto.time}:00`);
      } else {
        createdAt = new Date(dto.date);
      }
    }

    const lead = await this.prisma.$transaction(async (tx: any) => {
      // 1. Calculate branch-specific serial ID using branch counter
      let branchSerialId = null;
      if (branchId) {
        const branch = await tx.branch.update({
          where: { id: branchId },
          data: { lastSerialNumber: { increment: 1 } },
          select: { lastSerialNumber: true },
        });
        branchSerialId = branch.lastSerialNumber;
      }

      // 2. Create the lead
      return tx.lead.create({
        data: {
          phoneNumber: dto.phoneNumber,
          name: dto.name || null,
          status: 'NEW',
          branchId,
          branchSerialId,
          assignedToId:
            user?.userType === 'MOBILE'
              ? user.id
              : dto.assignedToId === 'unassigned' || dto.assignedToId === ''
                ? null
                : dto.assignedToId || null,
          createdAt: createdAt || new Date(),
          lastCallAt: createdAt || new Date(),
          loanType: dto.loanType || 'Other',
          customLoanType: dto.loanType === 'Other' ? dto.customLoanType : null,
          loanTypeId:
            dto.loanTypeId === 'unassigned' || dto.loanTypeId === ''
              ? null
              : dto.loanTypeId || null,
        },
        include: {
          assignedTo: { select: { id: true, name: true, username: true } },
          assignedLoanType: true,
          _count: { select: { callLogs: true } },
          applicationForm: { select: { id: true, pdfUrl: true } } as any,
        },
      });
    });

    if (user) {
      await this.auditLog.createLog(
        user.id,
        user.userType as any,
        'CREATE_MANUAL_LEAD',
        `Created Manual Lead: ${lead.name || 'N/A'} (${lead.phoneNumber})`,
        { targetId: lead.id, targetType: 'LEAD', branchId: lead.branchId },
      );
    }

    return await this.formatLead(lead, user);
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

      // Role-based status restrictions
      const restrictedStatuses = [
        'LOGIN',
        'SANCTIONED',
        'DISBURSEMENT',
        'REJECT',
      ];
      if (dto.status && restrictedStatuses.includes(dto.status)) {
        throw new ForbiddenException(
          `Only administrators can set status to ${dto.status.replace('_', ' ')}`,
        );
      }

      // CLOSED status restriction
      if (lead.status === 'CLOSED') {
        throw new ForbiddenException(
          'Only administrators can modify a closed lead',
        );
      }
    }
    // Admin role users have permission to update any lead in this system as per latest requirements.

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
          ? dto.assignedToId === 'unassigned' || dto.assignedToId === ''
            ? null
            : dto.assignedToId
          : lead.assignedToId;

      if (!newAssignedToId && user?.userType === 'MOBILE' && user?.id) {
        newAssignedToId = user.id;
      }

      // Sanitize loanTypeId to handle placeholder values from frontend
      const finalLoanTypeId =
        dto.loanTypeId !== undefined
          ? dto.loanTypeId === 'unassigned' || dto.loanTypeId === ''
            ? null
            : dto.loanTypeId
          : lead.loanTypeId;

      let lt: any = null;
      if (finalLoanTypeId) {
        // 1. Verify existence of the loan type (prevents 500 error from FK constraint)
        lt = await this.prisma.loanType.findUnique({
          where: { id: dto.loanTypeId },
        });

        if (!lt) {
          throw new NotFoundException(
            `Loan type with ID "${finalLoanTypeId}" not found`,
          );
        }

        // 2. Enforce ownership restriction ONLY for MOBILE users
        if (user?.userType === 'MOBILE') {
          let targetAdminId = user?.id;
          const branchAdmin = await this.prisma.adminUser.findFirst({
            where: { branchId: user.branchId },
          });
          if (branchAdmin) {
            targetAdminId = branchAdmin.id;
          }

          if (lt.createdBy !== targetAdminId) {
            throw new ForbiddenException(
              'You do not have permission to use this loan type',
            );
          }
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
          loanType:
            dto.loanType === 'Other'
              ? 'Other'
              : dto.loanType !== undefined
                ? dto.loanType
                : lt?.name || lead.loanType,
          loanTypeId: finalLoanTypeId,
          profile: dto.profile !== undefined ? dto.profile : lead.profile,
          cibilStatus:
            dto.cibilStatus !== undefined ? dto.cibilStatus : lead.cibilStatus,
          cibilRemark:
            dto.cibilRemark !== undefined ? dto.cibilRemark : lead.cibilRemark,
          customLoanType:
            dto.loanType === 'Other'
              ? dto.customLoanType || lead.customLoanType
              : dto.loanType !== undefined ||
                  (dto.loanTypeId && dto.loanTypeId !== 'unassigned')
                ? null
                : lead.customLoanType,
          statusRemark:
            dto.statusRemark !== undefined
              ? dto.statusRemark
              : lead.statusRemark,
          // Update lastCallAt for 'Connected' status
          ...(finalStatus === 'COMPLETED' ? { lastCallAt: new Date() } : {}),
          // Auto-assign branchId if missing and updater is an admin
          ...(!lead.branchId &&
            user?.userType === 'ADMIN' && { branchId: user.branchId }),
        },
        include: {
          assignedTo: {
            select: { id: true, name: true, username: true },
          },
          assignedLoanType: true,
          _count: {
            select: { callLogs: true },
          },
          applicationForm: { select: { id: true, pdfUrl: true } } as any,
        },
      });

      // NOTE: No AuditLog here — the CallLog created below (lines 363+)
      // already records who performed the action (adminId/callerId), so
      // adding an AuditLog would create a duplicate in the unified feed.
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

    return await this.formatLead(updatedLead, user);
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
        baseLeadWhere.AND = [
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
    } else if (user?.userType === 'ADMIN') {
      // 1. Filter by branch (broadened visibility)
      baseLeadWhere.branchId = user.branchId;
      // For call logs, we want logs related to these leads
      baseCallWhere.lead = { ...baseLeadWhere };
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

  async assign(id: string, dto: AssignLeadDto, user?: any) {
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

    if (user) {
      const assigneeName = updatedLead.assignedTo?.name || 'Unassigned';
      await this.auditLog.createLog(
        user.id,
        user.userType as any,
        'ASSIGN_LEAD',
        `Assigned Lead: ${lead.name || lead.phoneNumber} to ${assigneeName}`,
        { targetId: id, targetType: 'LEAD', branchId: lead.branchId },
      );
    }

    return await this.formatLead(
      updatedLead,
      dto.userId !== undefined
        ? { id: dto.userId, userType: 'MOBILE' }
        : undefined,
    );
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
        where.AND = [
          ...(where.AND || []),
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
    } else if (user?.userType === 'ADMIN' && user.role === 'ADMIN') {
      // 1. Filter by branch (broadened visibility)
      where.branchId = user.branchId;
    }
    // SUPER_ADMIN sees everything unless they explicitly filter by branchId or assignedToId query

    if (assignedToId) {
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
        assignedLoanType: true,
        _count: {
          select: { callLogs: true },
        },
        applicationForm: { select: { id: true, pdfUrl: true } } as any,
      },
    });

    // 🚀 SELF-HEALING: Repair missing PDFs in the background
    this.healMissingPdfs(leads);

    // Sort by latest call/activity first, then by serialId desc
    leads.sort((a, b) => {
      const timeA = a.lastCallAt
        ? new Date(a.lastCallAt).getTime()
        : new Date(a.createdAt).getTime();
      const timeB = b.lastCallAt
        ? new Date(b.lastCallAt).getTime()
        : new Date(b.createdAt).getTime();

      if (timeB !== timeA) {
        return timeB - timeA;
      }

      // Fallback to newest leads first
      return (b.serialId || 0) - (a.serialId || 0);
    });

    return await Promise.all(leads.map((lead) => this.formatLead(lead, user)));
  }

  async findOne(id: string, user?: any) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, username: true },
        },
        assignedLoanType: true,
        _count: {
          select: { callLogs: true },
        },
        applicationForm: true,
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
      const isManualLeadInBranch =
        lead.mobileId === null && lead.branchId === user.branchId;

      if (
        !isManualLeadInBranch &&
        (!lead.mobileId || !allowedMobileIds.includes(lead.mobileId))
      ) {
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
    }
    // Admins have permission to view leads they can access (determined by findUnique below if we wanted to be stricter, but here we prioritize providing access)

    return await this.formatLead(lead, user);
  }

  async remove(id: string, user?: any) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    // PERMISSION CHECK
    if (user?.userType === 'MOBILE') {
      throw new ForbiddenException('Mobile users cannot delete leads');
    } else if (user?.userType === 'ADMIN' && user.role === 'ADMIN') {
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: user.id },
      });
      const allowedMobileIds = (admin?.mobileIds as string[]) || [];

      const isBranchMatch = lead.branchId === user.branchId;
      const isMobileMatch =
        lead.mobileId && allowedMobileIds.includes(lead.mobileId);

      if (!isBranchMatch && !isMobileMatch) {
        throw new ForbiddenException(
          'You do not have permission to delete this lead',
        );
      }
    }

    // Delete associated call logs first
    await this.prisma.callLog.deleteMany({ where: { leadId: id } });

    const res = await this.prisma.lead.delete({ where: { id } });

    if (user) {
      await this.auditLog.createLog(
        user.id,
        user.userType as any,
        'DELETE_LEAD',
        `Deleted Lead: ${lead.name || lead.phoneNumber}`,
        { targetId: id, targetType: 'LEAD', branchId: lead.branchId },
      );
    }

    return res;
  }

  async getApplicationForm(leadId: string) {
    const form = await this.prisma.applicationForm.findUnique({
      where: { leadId },
    });
    if (!form) throw new NotFoundException('Application form not found');

    if (form.pdfUrl) {
      try {
        const presignedUrl = await this.s3Service.getPresignedUrl(
          `application_form_${leadId}.pdf`,
        );
        form.pdfUrl = presignedUrl;
      } catch (e) {
        this.logger.error(
          `Failed to generate presigned URL for form ${leadId}`,
        );
      }
    }

    return form;
  }

  async updateApplicationForm(
    leadId: string,
    dto: CreateApplicationFormDto,
    user?: any,
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    // Convert DTO to a plain JS object to ensure Prisma handles Json fields correctly
    // especially with members that might be class instances from class-transformer
    const plainForm = JSON.parse(JSON.stringify(dto));
    this.logger.log(`SAVING TO PRISMA: ${JSON.stringify(plainForm, null, 2)}`);

    const form = await (this.prisma as any).applicationForm.upsert({
      where: { leadId },
      update: {
        ...plainForm,
      },
      create: {
        ...plainForm,
        leadId,
      },
    });

    if (user) {
      await this.auditLog.createLog(
        user.id,
        user.userType as any,
        'SAVE_APPLICATION_FORM',
        `Saved Application Form for Lead: ${lead.name || lead.phoneNumber}`,
        { targetId: leadId, targetType: 'LEAD', branchId: lead.branchId },
      );
    }

    // 🚀 NEW: Generate and Upload PDF to S3 in the background or immediately
    try {
      const pdfBuffer = await this.generateApplicationPdf(leadId);
      const fileName = `application_form_${leadId}.pdf`;
      const s3Url = await this.s3Service.uploadPdf(pdfBuffer, fileName);

      // Update the form with the S3 U
      const updatedForm = await (this.prisma as any).applicationForm.update({
        where: { id: form.id },
        data: { pdfUrl: s3Url },
      });

      try {
        const presignedUrl = await this.s3Service.getPresignedUrl(fileName);
        return { ...updatedForm, pdfUrl: presignedUrl };
      } catch (e) {
        return { ...updatedForm, pdfUrl: s3Url };
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle S3 PDF upload for lead ${leadId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      if (form.pdfUrl) {
        try {
          form.pdfUrl = await this.s3Service.getPresignedUrl(
            `application_form_${leadId}.pdf`,
          );
        } catch (e) {}
      }
      return form; // Return the form anyway even if PDF upload fails
    }
  }

  private async healMissingPdfs(leads: any[]) {
    const missing = leads.filter(
      (l) => l.applicationForm && !l.applicationForm.pdfUrl,
    );
    if (missing.length === 0) return;

    this.logger.log(
      `🛠 Found ${missing.length} leads missing PDFs. Repairing in background...`,
    );

    // Process in background (don't await)
    missing.forEach((lead) => {
      this.repairLeadPdf(lead.id).catch((err) =>
        this.logger.error(
          `Failed to heal PDF for lead ${lead.id}: ${err.message}`,
        ),
      );
    });
  }

  private async repairLeadPdf(leadId: string) {
    try {
      const pdfBuffer = await this.generateApplicationPdf(leadId);
      const fileName = `application_form_${leadId}.pdf`;
      const s3Url = await this.s3Service.uploadPdf(pdfBuffer, fileName);

      await (this.prisma as any).applicationForm.update({
        where: { leadId },
        data: { pdfUrl: s3Url },
      });

      this.logger.log(`✅ Successfully healed PDF for lead ${leadId}`);
    } catch (error: any) {
      this.logger.error(
        `✗ Background repair failed for ${leadId}: ${error.message}`,
      );
    }
  }

  async generateApplicationPdf(leadId: string) {
    const lead = await (this.prisma as any).lead.findUnique({
      where: { id: leadId },
      include: {
        applicationForm: true,
        branch: true,
      },
    });

    if (!lead || !lead.applicationForm) {
      throw new NotFoundException('Application form not found for this lead');
    }

    const form = lead.applicationForm;
    const branchName = lead.branch?.name || 'URBAN MONEY';

    // Map the database fields to the PDF service expected data structure
    // Handling JSON fields by casting to any safe access
    const addresses = (form.addresses as any) || {};
    const financials = (form.financials as any) || {};
    const references = (form.references as any) || [];

    return this.pdfService.generateApplicationPdf({
      branchName,
      companyName: branchName, // Map branchName to companyName for the header design
      leadName: form.name,
      phoneNumber: form.phoneNumber,
      fileNumber: form.fileNumber,
      email: form.email,
      motherName: form.motherName,
      dob: form.dob,
      addresses: {
        current: addresses.current,
        permanent: addresses.permanent,
        office: addresses.office,
      },
      financials: {
        netSalaryInr: financials.netSalaryInr,
        loanAmountInr: financials.loanAmountInr,
        obligationInr: financials.obligationInr,
      },
      product: form.product,
      residentType: form.residentType,
      leadBy: form.leadBy,
      references: references,
      coApplicants: (form.coApplicants as any) || [],
    });
  }
}
