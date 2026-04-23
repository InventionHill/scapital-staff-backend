import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCallDto } from './dto/create-call.dto';
import { GroupedCreateCallDto } from './dto/grouped-create-call.dto';
import * as exceljs from 'exceljs';

import { AuditLogService } from '../audit-logs/audit-logs.service';

@Injectable()
export class CallsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async handleIncomingCall(dto: CreateCallDto) {
    // Allow all call types
    const callTime = dto.time;

    // IDENTIFY BRANCH/ADMIN
    let identifiedBranchId = null;
    if (dto.mobileId) {
      const admin = await this.prisma.adminUser.findFirst({
        where: {
          mobileIds: {
            array_contains: dto.mobileId,
          },
        },
      });
      if (admin) {
        identifiedBranchId = admin.branchId;
      }
    }

    // Fallback: Identify branch from the caller (Mobile User) directly
    if (!identifiedBranchId && dto.callerId) {
      const caller = await this.prisma.mobileUser.findUnique({
        where: { id: dto.callerId },
        select: { branchId: true },
      });
      if (caller) identifiedBranchId = caller.branchId;
    }

    // 1. Find or create lead
    let lead = await this.prisma.lead.findFirst({
      where: {
        phoneNumber: dto.phoneNumber,
        branchId: identifiedBranchId,
      },
    });

    if (!lead) {
      lead = await this.prisma.$transaction(async (tx) => {
        // Calculate branch-specific serial using branch counter
        let branchSerialId = null;
        if (identifiedBranchId) {
          const branch = await tx.branch.update({
            where: { id: identifiedBranchId },
            data: { lastSerialNumber: { increment: 1 } },
            select: { lastSerialNumber: true },
          });
          branchSerialId = branch.lastSerialNumber;
        }

        return tx.lead.create({
          data: {
            phoneNumber: dto.phoneNumber,
            name: (dto as any).name || 'Anonymous Lead',
            status: 'NEW',
            assignedToId: dto.callerId,
            createdAt: callTime ? new Date(callTime) : undefined,
            mobileId: dto.mobileId,
            branchId: identifiedBranchId,
            branchSerialId,
          },
        });
      });

      // Log automatic lead creation
      await this.auditLog.createLog(
        dto.callerId || 'SYSTEM',
        dto.callerId ? 'MOBILE' : 'SYSTEM',
        'AUTO_CREATE_LEAD',
        `Automatically created lead for number: ${dto.phoneNumber}`,
        { targetId: lead.id, targetType: 'LEAD', branchId: identifiedBranchId },
      );
    } else {
      // Validate assignment if a specific caller is logging the call
      if (
        lead.assignedToId !== null &&
        dto.callerId &&
        lead.assignedToId !== dto.callerId
      ) {
        throw new ForbiddenException(
          'This lead is already assigned to another mobile user',
        );
      }

      const updateData: any = {};
      if (!lead.assignedToId && dto.callerId) {
        updateData.assignedToId = dto.callerId;
      }

      // If lead was previously unassigned to a branch, assign it now if we have a match
      if (!lead.branchId && identifiedBranchId) {
        updateData.branchId = identifiedBranchId;
      }

      if (!lead.mobileId && dto.mobileId) {
        updateData.mobileId = dto.mobileId;
      }

      // If lead exists but has no name or is "Anonymous Lead", update it if we have a contact name
      const incomingContactName = (dto as any).name;
      if (
        incomingContactName &&
        (!lead.name || lead.name === 'Anonymous Lead')
      ) {
        updateData.name = incomingContactName;
      }

      if (Object.keys(updateData).length > 0) {
        lead = await this.prisma.lead.update({
          where: { id: lead.id },
          data: updateData,
        });
      }
    }

    // 2. Create or Update Call Log
    const existingCallLog = await this.prisma.callLog.findFirst({
      where: { phoneNumber: dto.phoneNumber, leadId: lead.id },
    });

    let callLog;
    if (existingCallLog) {
      callLog = await this.prisma.callLog.update({
        where: { id: existingCallLog.id },
        data: {
          callType: dto.callType?.toUpperCase() || 'INCOMING',
          duration: dto.duration || existingCallLog.duration,
          outcome: dto.outcome || existingCallLog.outcome,
          notes: dto.notes || existingCallLog.notes,
          callerId: dto.callerId || existingCallLog.callerId,
          mobileId: dto.mobileId || existingCallLog.mobileId,
          mobileName: dto.mobileName || existingCallLog.mobileName,
          createdAt: callTime ? new Date(callTime) : new Date(),
        },
      });

      // Update lead record to RECALL status
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'RECALL',
          lastCallAt: callTime ? new Date(callTime) : new Date(),
        },
      });
    } else {
      callLog = await this.prisma.callLog.create({
        data: {
          phoneNumber: dto.phoneNumber,
          callType: dto.callType?.toUpperCase() || 'INCOMING',
          duration: dto.duration,
          outcome: dto.outcome,
          notes: dto.notes,
          leadId: lead.id,
          callerId: dto.callerId,
          mobileId: dto.mobileId,
          mobileName: dto.mobileName,
          createdAt: callTime ? new Date(callTime) : undefined,
        },
      });
    }

    // 3. Update lead's last call timestamp
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        lastCallAt: callTime ? new Date(callTime) : new Date(),
      },
    });

    return { callLog, lead };
  }

  async handleBatchIncomingCalls(dtos: CreateCallDto[]) {
    const results = [];
    for (const dto of dtos) {
      try {
        const result = await this.handleIncomingCall(dto);
        results.push({ status: 'success', data: result });
      } catch (error) {
        results.push({
          status: 'error',
          message: error?.response?.message || error.message,
          phoneNumber: dto.phoneNumber,
        });
      }
    }
    return results;
  }

  async handleGroupedIncomingCalls(dto: GroupedCreateCallDto) {
    const results = [];
    const { mobileId, mobileName, calls } = dto;

    for (const callDto of calls) {
      try {
        const result = await this.handleIncomingCall({
          ...callDto,
          mobileId,
          mobileName,
          callType: callDto.type?.toUpperCase() || 'INCOMING',
        } as any);
        results.push({ status: 'success', data: result });
      } catch (error) {
        results.push({
          status: 'error',
          message: error?.response?.message || error.message,
          phoneNumber: callDto.phoneNumber,
        });
      }
    }

    return results;
  }

  async findAll(
    user: any,
    startDate?: string,
    endDate?: string,
    callerId?: string,
    search?: string,
    status?: string,
    page: number = 1,
    limit: number = 10,
    adminId?: string,
  ) {
    const skip = (page - 1) * limit;

    // --- CASE 1: SUPER ADMIN UNIFIED ACTIVITY LOGS ---
    if (user?.userType === 'SUPER_ADMIN') {
      // 1. Identify the branch context
      let branchId: string | null = null;
      let admin_context: any = null;

      if (adminId) {
        admin_context = await this.prisma.adminUser.findUnique({
          where: { id: adminId },
        });
        branchId = admin_context?.branchId;
      }

      // 2. Build Where Clauses
      const callWhere: any = {};
      const auditWhere: any = {};

      if (adminId && admin_context) {
        // Viewing a SPECIFIC admin — match adminId directly so call logs
        // created by this admin (e.g. lead status updates) always appear.
        const branchMobileFilter = branchId ? [{ caller: { branchId } }] : [];
        callWhere.OR = [
          { adminId: admin_context.id }, // calls logged by this admin
          ...branchMobileFilter, // calls by mobile users in same branch
        ];
        if (branchId) {
          auditWhere.OR = [{ branchId }, { actorId: admin_context.id }];
        } else {
          auditWhere.actorId = admin_context.id;
        }
      } else if (branchId) {
        callWhere.OR = [{ caller: { branchId } }, { admin: { branchId } }];
        auditWhere.branchId = branchId;
      }

      // 2.5 Apply specific callerId filter if viewing a specific mobile user
      if (callerId) {
        // Narrow down callWhere to ONLY this caller
        callWhere.callerId = callerId;
        // Narrow down auditWhere to ONLY this actor
        auditWhere.actorId = callerId;

        // Remove branch-wide ORs to keep it focused on the specific user
        delete callWhere.OR;
        delete auditWhere.OR;
      }

      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateFilter.lte = end;
        }
        callWhere.createdAt = dateFilter;
        auditWhere.createdAt = dateFilter;
      }

      if (search) {
        callWhere.OR = [
          ...(callWhere.OR || []),
          { phoneNumber: { contains: search } },
          { notes: { contains: search } },
        ];
        auditWhere.OR = [
          { action: { contains: search } },
          { details: { contains: search } },
        ];
      }

      // 3. Fetch Data
      const [callLogs, auditLogs] = await Promise.all([
        this.prisma.callLog.findMany({
          where: callWhere,
          include: {
            caller: { select: { id: true, name: true, username: true } },
            admin: { select: { id: true, name: true } },
            lead: {
              select: {
                id: true,
                name: true,
                status: true,
                serialId: true,
                branchSerialId: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        (this.prisma as any).auditLog.findMany({
          where: auditWhere,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      // 3.5 Resolve Actor Names for Audit Logs
      const adminIds = [
        ...new Set(
          auditLogs
            .filter((l: any) => l.actorType === 'ADMIN' && l.actorId)
            .map((l: any) => l.actorId),
        ),
      ] as string[];
      const superAdminIds = [
        ...new Set(
          auditLogs
            .filter((l: any) => l.actorType === 'SUPER_ADMIN' && l.actorId)
            .map((l: any) => l.actorId),
        ),
      ] as string[];
      const mobileIds = [
        ...new Set(
          auditLogs
            .filter((l: any) => l.actorType === 'MOBILE' && l.actorId)
            .map((l: any) => l.actorId),
        ),
      ] as string[];

      const [admins, superAdmins, mobiles] = await Promise.all([
        adminIds.length > 0
          ? this.prisma.adminUser.findMany({
              where: { id: { in: adminIds } },
              select: { id: true, name: true },
            })
          : [],
        superAdminIds.length > 0
          ? (this.prisma as any).superAdmin.findMany({
              where: { id: { in: superAdminIds } },
              select: { id: true, name: true },
            })
          : [],
        mobileIds.length > 0
          ? this.prisma.mobileUser.findMany({
              where: { id: { in: mobileIds } },
              select: { id: true, name: true },
            })
          : [],
      ]);

      const actorMap = new Map();
      admins.forEach((a: any) => actorMap.set(a.id, a.name || 'Admin'));
      superAdmins.forEach((a: any) =>
        actorMap.set(a.id, a.name || 'Super Admin'),
      );
      mobiles.forEach((a: any) => actorMap.set(a.id, a.name || 'Mobile User'));

      // 3.6 Resolve Lead and Mobile details for AuditLogs
      const auditLeadIds = [
        ...new Set(
          auditLogs
            .filter((l: any) => l.targetType === 'LEAD' && l.targetId)
            .map((l: any) => l.targetId),
        ),
      ] as string[];
      const auditMobileIds = [
        ...new Set(
          auditLogs
            .filter((l: any) => l.targetType === 'MOBILE' && l.targetId)
            .map((l: any) => l.targetId),
        ),
      ] as string[];

      const [auditLeads, auditMobileTargets] = await Promise.all([
        auditLeadIds.length > 0
          ? this.prisma.lead.findMany({
              where: { id: { in: auditLeadIds } },
              select: {
                id: true,
                name: true,
                phoneNumber: true,
                serialId: true,
                status: true,
              },
            })
          : [],
        auditMobileIds.length > 0
          ? this.prisma.mobileUser.findMany({
              where: { id: { in: auditMobileIds } },
              select: { id: true, name: true },
            })
          : [],
      ]);

      const leadMap = new Map();
      auditLeads.forEach((l: any) => leadMap.set(l.id, l));
      const mobileTargetMap = new Map();
      auditMobileTargets.forEach((m: any) => mobileTargetMap.set(m.id, m));

      // 4. Merge and Transform
      const mergedActivity = [
        ...callLogs.map((log) => ({
          id: log.id,
          type: 'CALL',
          createdAt: log.createdAt,
          phoneNumber: log.phoneNumber,
          callType: log.callType,
          duration: log.duration,
          outcome: log.outcome,
          notes: log.notes,
          leadId: log.leadId,
          caller: log.caller || log.admin,
          lead: log.lead
            ? {
                status: log.lead.status,
                name: log.lead.name,
                serialId: log.lead.serialId,
                branchSerialId: log.lead.branchSerialId,
                leadId: log.lead.branchSerialId
                  ? `LD-${String(log.lead.branchSerialId).padStart(5, '0')}`
                  : log.lead.serialId
                    ? `LD-${String(log.lead.serialId).padStart(5, '0')}`
                    : null,
              }
            : null,
        })),
        ...auditLogs.map((log: any) => {
          const auditLead =
            log.targetType === 'LEAD' ? leadMap.get(log.targetId) : null;
          const auditMobile =
            log.targetType === 'MOBILE'
              ? mobileTargetMap.get(log.targetId)
              : null;

          return {
            id: log.id,
            type: 'ACTION',
            createdAt: log.createdAt,
            action: log.action,
            phoneNumber: auditLead?.phoneNumber || null,
            callType: 'ADMIN_ACTION',
            duration: 0,
            outcome: log.action.replace(/_/g, ' '),
            notes: log.details,
            targetType: log.targetType,
            targetId: log.targetId,
            actor: {
              name:
                actorMap.get(log.actorId) ||
                (log.actorId === 'SYSTEM' ? 'System' : 'Unknown User'),
              id: log.actorId,
            },
            caller: {
              name:
                actorMap.get(log.actorId) ||
                (log.actorId === 'SYSTEM' ? 'System' : 'Unknown User'),
            },
            // Attach target details
            target: auditLead
              ? {
                  type: 'LEAD',
                  id: auditLead.id,
                  name: auditLead.name,
                  serialId: auditLead.serialId,
                  branchSerialId: auditLead.branchSerialId,
                  status: auditLead.status,
                }
              : auditMobile
                ? {
                    type: 'MOBILE',
                    id: auditMobile.id,
                    name: auditMobile.name,
                  }
                : null,
            lead: auditLead
              ? {
                  id: auditLead.id,
                  name: auditLead.name,
                  phoneNumber: auditLead.phoneNumber,
                  serialId: auditLead.serialId,
                  branchSerialId: auditLead.branchSerialId,
                  leadId: auditLead.branchSerialId
                    ? `LD-${String(auditLead.branchSerialId).padStart(5, '0')}`
                    : auditLead.serialId
                      ? `LD-${String(auditLead.serialId).padStart(5, '0')}`
                      : null,
                  status: auditLead.status,
                }
              : null,
          };
        }),
      ];

      mergedActivity.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      const total = mergedActivity.length;
      const data = mergedActivity.slice(skip, skip + Number(limit));

      return { data, total, page, limit };
    }

    // --- CASE 2: TRADITIONAL LEAD-BASED CALL LOGS (Staff Dashboard) ---
    const where: any = {};

    // Branch & Mobile ID Isolation (copied from old logic)
    if (user?.userType === 'ADMIN' && user?.role === 'ADMIN') {
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: user.id },
      });
      const allowedIds = (admin?.mobileIds as string[]) || [];
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { mobileId: { in: allowedIds } },
            { mobileId: null, branchId: user.branchId },
          ],
        },
      ];
    } else if (user?.userType === 'MOBILE') {
      const branchAdmin = await this.prisma.adminUser.findUnique({
        where: { branchId: user.branchId },
      });

      if (!branchAdmin) {
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
    }

    if (callerId) {
      if (callerId === 'unassigned') {
        where.assignedToId = null;
      } else {
        where.assignedToId = callerId;
      }
    }
    if (search) {
      where.OR = [
        { phoneNumber: { contains: search } },
        { name: { contains: search } },
      ];
    }
    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.lastCallAt = {};
      if (startDate) where.lastCallAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.lastCallAt.lte = end;
      }
    }

    const [allLeads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true } },
          callLogs: {
            include: {
              caller: { select: { id: true, name: true } },
              admin: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    // Sort by sequential order (branchSerialId)
    allLeads.sort((a, b) => {
      const idA = a.branchSerialId || a.serialId || 0;
      const idB = b.branchSerialId || b.serialId || 0;
      return idB - idA;
    });

    const leads = allLeads.slice(skip, skip + Number(limit));

    const data = leads.map((lead) => {
      const latestCall = lead.callLogs[0];
      return {
        id: latestCall?.id || lead.id,
        phoneNumber: lead.phoneNumber,
        createdAt: latestCall?.createdAt || lead.lastCallAt || lead.createdAt,
        callType: latestCall?.callType || 'OUTGOING',
        duration: latestCall?.duration || 0,
        outcome: latestCall?.outcome || lead.status,
        notes: latestCall?.notes,
        leadId: lead.id,
        caller: lead.assignedTo || latestCall?.caller,
        lead: {
          status: lead.status,
          name: lead.name,
          serialId: lead.serialId,
          branchSerialId: lead.branchSerialId,
          leadId: lead.branchSerialId
            ? `LD-${String(lead.branchSerialId).padStart(5, '0')}`
            : lead.serialId
              ? `LD-${String(lead.serialId).padStart(5, '0')}`
              : null,
        },
      };
    });

    return { data, total, page, limit };
  }

  async exportCallLogs(
    user: any,
    startDate?: string,
    endDate?: string,
    callerId?: string,
    search?: string,
    status?: string,
    adminId?: string,
  ) {
    // --- CASE 1: SUPER ADMIN UNIFIED ACTIVITY EXPORT ---
    if (user?.userType === 'SUPER_ADMIN') {
      // 1. Identify context
      let branchId: string | null = null;
      let admin_context: any = null;

      if (adminId) {
        admin_context = await this.prisma.adminUser.findUnique({
          where: { id: adminId },
        });
        branchId = admin_context?.branchId;
      }

      // 2. Build Where Clauses
      const callWhere: any = {};
      const auditWhere: any = {};

      if (branchId) {
        callWhere.OR = [{ caller: { branchId } }, { admin: { branchId } }];
        auditWhere.branchId = branchId;
      } else if (admin_context) {
        const allowedMobileIds = (admin_context.mobileIds as string[]) || [];
        callWhere.OR = [
          { mobileId: { in: allowedMobileIds } },
          { adminId: admin_context.id },
        ];
        auditWhere.actorId = admin_context.id;
      }

      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateFilter.lte = end;
        }
        callWhere.createdAt = dateFilter;
        auditWhere.createdAt = dateFilter;
      }

      // 3. Fetch
      const [callLogs, auditLogs] = await Promise.all([
        this.prisma.callLog.findMany({
          where: callWhere,
          include: {
            caller: { select: { name: true } },
            admin: { select: { name: true } },
            lead: {
              select: {
                serialId: true,
                branchSerialId: true,
                name: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        (this.prisma as any).auditLog.findMany({
          where: auditWhere,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet('Activity Logs');

      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Time', key: 'time', width: 12 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Agent/Admin', key: 'agent', width: 20 },
        { header: 'Target/Lead', key: 'target', width: 20 },
        { header: 'Action/Outcome', key: 'action', width: 20 },
        { header: 'Notes/Details', key: 'notes', width: 40 },
      ];

      // 3.5 Resolve Actor Names
      const adminIds = [
        ...new Set(
          auditLogs
            .filter((l: any) => l.actorType === 'ADMIN' && l.actorId)
            .map((l: any) => l.actorId),
        ),
      ] as string[];
      const superAdminIds = [
        ...new Set(
          auditLogs
            .filter((l: any) => l.actorType === 'SUPER_ADMIN' && l.actorId)
            .map((l: any) => l.actorId),
        ),
      ] as string[];
      const mobileIds = [
        ...new Set(
          auditLogs
            .filter((l: any) => l.actorType === 'MOBILE' && l.actorId)
            .map((l: any) => l.actorId),
        ),
      ] as string[];

      const [admins, superAdmins, mobiles] = await Promise.all([
        adminIds.length > 0
          ? this.prisma.adminUser.findMany({
              where: { id: { in: adminIds } },
              select: { id: true, name: true },
            })
          : [],
        superAdminIds.length > 0
          ? (this.prisma as any).superAdmin.findMany({
              where: { id: { in: superAdminIds } },
              select: { id: true, name: true },
            })
          : [],
        mobileIds.length > 0
          ? this.prisma.mobileUser.findMany({
              where: { id: { in: mobileIds } },
              select: { id: true, name: true },
            })
          : [],
      ]);

      const actorMap = new Map();
      admins.forEach((a: any) => actorMap.set(a.id, a.name || 'Admin'));
      superAdmins.forEach((a: any) =>
        actorMap.set(a.id, a.name || 'Super Admin'),
      );
      mobiles.forEach((a: any) => actorMap.set(a.id, a.name || 'Mobile User'));

      const merged = [
        ...callLogs.map((log) => ({
          date: log.createdAt,
          type: 'CALL',
          agent: (log.caller || log.admin)?.name || 'System',
          target: log.lead
            ? log.lead.branchSerialId
              ? `LD-${String(log.lead.branchSerialId).padStart(5, '0')}`
              : log.lead.serialId
                ? `LD-${String(log.lead.serialId).padStart(5, '0')}`
                : log.phoneNumber
            : log.phoneNumber,
          action: log.outcome || 'No Outcome',
          notes: log.notes || '',
        })),
        ...auditLogs.map((log: any) => ({
          date: log.createdAt,
          type: 'ADMIN ACTION',
          agent:
            actorMap.get(log.actorId) ||
            (log.actorId === 'SYSTEM' ? 'System' : 'Unknown'),
          target: 'Panel',
          action: log.action.replace(/_/g, ' '),
          notes: log.details || '',
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      merged.forEach((item) => {
        worksheet.addRow({
          date: new Date(item.date).toISOString().split('T')[0],
          time: new Date(item.date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
          type: item.type,
          agent: item.agent,
          target: item.target,
          action: item.action,
          notes: item.notes,
        });
      });

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      return workbook.xlsx.writeBuffer();
    }

    // --- CASE 2: TRADITIONAL LEAD-BASED EXPORT (Staff Dashboard) ---
    const where: any = {};

    if (user?.userType === 'ADMIN' && user?.role === 'ADMIN') {
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: user.id },
      });
      const allowedIds = (admin?.mobileIds as string[]) || [];
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { mobileId: { in: allowedIds } },
            { mobileId: null, branchId: user.branchId },
          ],
        },
      ];
    } else if (user?.userType === 'MOBILE') {
      const branchAdmin = await this.prisma.adminUser.findUnique({
        where: { branchId: user.branchId },
      });

      if (!branchAdmin) {
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
    }

    if (callerId) {
      if (callerId === 'unassigned') {
        where.assignedToId = null;
      } else {
        where.assignedToId = callerId;
      }
    }
    if (search) {
      where.OR = [
        { phoneNumber: { contains: search } },
        { name: { contains: search } },
      ];
    }
    if (status) where.status = status;

    if (startDate || endDate) {
      where.lastCallAt = {};
      if (startDate) where.lastCallAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.lastCallAt.lte = end;
      }
    }

    const leads = await this.prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { name: true } },
        callLogs: {
          include: {
            caller: { select: { name: true } },
            admin: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastCallAt: 'desc' },
    });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Call Leads');

    worksheet.columns = [
      { header: 'Lead ID', key: 'id', width: 12 },
      { header: 'Phone Number', key: 'phoneNumber', width: 15 },
      { header: 'Customer Name', key: 'customerName', width: 20 },
      { header: 'Last Call Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Latest Type', key: 'type', width: 15 },
      { header: 'Agent', key: 'agent', width: 20 },
    ];

    leads.forEach((lead) => {
      const latestCall = lead.callLogs[0];
      const displayDate =
        latestCall?.createdAt || lead.lastCallAt || lead.createdAt;

      worksheet.addRow({
        id: lead.branchSerialId
          ? `LD-${String(lead.branchSerialId).padStart(5, '0')}`
          : lead.serialId
            ? `LD-${String(lead.serialId).padStart(5, '0')}`
            : '----',
        phoneNumber: lead.phoneNumber,
        customerName: lead.name || 'Customer Name',
        date: new Date(displayDate).toISOString().split('T')[0],
        time: new Date(displayDate).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        status: lead.status || 'Not Linked',
        type: latestCall?.callType || '---',
        agent: (lead.assignedTo || latestCall?.caller)?.name || 'Unassigned',
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    return workbook.xlsx.writeBuffer();
  }

  async update(id: string, updateData: { callerId: string | null }) {
    // Normalize special unassigned values
    if (
      updateData.callerId === 'unassigned' ||
      updateData.callerId === 'null'
    ) {
      updateData.callerId = null;
    }

    // Validate that the assigned user exists
    if (updateData.callerId) {
      const user = await this.prisma.mobileUser.findUnique({
        where: { id: updateData.callerId },
      });
      if (!user) {
        throw new NotFoundException(
          `Agent with ID ${updateData.callerId} not found`,
        );
      }
    }

    try {
      // 1. Try to update as a CallLog
      const callLog = await this.prisma.callLog.update({
        where: { id },
        data: { callerId: updateData.callerId },
        include: {
          caller: { select: { id: true, name: true } },
        },
      });

      // Also update the lead assignment to match the latest call agent
      if (callLog.leadId) {
        await this.prisma.lead.update({
          where: { id: callLog.leadId },
          data: { assignedToId: updateData.callerId },
        });
      }

      return callLog;
    } catch (error) {
      // 2. Fallback: If CallLog not found, check if ID is a Lead ID
      if (error.code === 'P2025') {
        const lead = await this.prisma.lead.findUnique({ where: { id } });
        if (lead) {
          await this.prisma.lead.update({
            where: { id },
            data: { assignedToId: updateData.callerId },
          });
          return { id, leadId: id, callerId: updateData.callerId }; // Return dummy structure to satisfy frontend
        }
        throw new NotFoundException(`Call Log or Lead with ID ${id} not found`);
      }
      throw error;
    }
  }
}
