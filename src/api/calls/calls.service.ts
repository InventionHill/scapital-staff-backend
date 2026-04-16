import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCallDto } from './dto/create-call.dto';
import { GroupedCreateCallDto } from './dto/grouped-create-call.dto';
import * as exceljs from 'exceljs';

@Injectable()
export class CallsService {
  constructor(private prisma: PrismaService) {}

  async handleIncomingCall(dto: CreateCallDto) {
    // Allow all call types

    const callTime = dto.time;

    // 1. Find or create lead
    let lead = await this.prisma.lead.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (!lead) {
      lead = await this.prisma.lead.create({
        data: {
          phoneNumber: dto.phoneNumber,
          status: 'NEW',
          assignedToId: dto.callerId, // Auto-assign to the first person who handled it
          createdAt: callTime ? new Date(callTime) : undefined,
        },
      });
    } else {
      const updateData: any = {};
      if (!lead.assignedToId && dto.callerId) {
        updateData.assignedToId = dto.callerId;
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
          message: error.message,
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
          message: error.message,
          phoneNumber: callDto.phoneNumber,
        });
      }
    }

    return results;
  }

  async findAll(
    startDate?: string,
    endDate?: string,
    callerId?: string,
    search?: string,
    status?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const where: any = {
      callLogs: { some: {} }, // Ensure lead has at least one call log
    };

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

    const skip = (page - 1) * limit;
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

    // Custom sorting: RECALL leads first, then by serialId desc for the rest
    allLeads.sort((a, b) => {
      if (a.status === 'RECALL' && b.status !== 'RECALL') return -1;
      if (a.status !== 'RECALL' && b.status === 'RECALL') return 1;
      return (b.serialId || 0) - (a.serialId || 0);
    });

    // Manual Pagination
    const leads = allLeads.slice(skip, skip + Number(limit));

    // Map leads back to a structure compatible with the frontend "CallLog" expectations
    const data = leads.map((lead) => {
      const latestCall = lead.callLogs[0];
      return {
        id: latestCall?.id || lead.id,
        phoneNumber: lead.phoneNumber,
        createdAt: latestCall?.createdAt || lead.lastCallAt || lead.createdAt,
        callType: latestCall?.callType || 'INCOMING',
        duration: latestCall?.duration || 0,
        outcome: latestCall?.outcome || lead.status,
        notes: latestCall?.notes,
        leadId: lead.id,
        caller: latestCall?.caller || latestCall?.admin || lead.assignedTo,
        lead: {
          status: lead.status,
          name: lead.name,
          serialId: lead.serialId,
        },
      };
    });

    return { data, total, page, limit };
  }

  async exportCallLogs(
    startDate?: string,
    endDate?: string,
    callerId?: string,
    search?: string,
    status?: string,
  ) {
    const where: any = {
      callLogs: { some: {} },
    };

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
        id: lead.serialId
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
        agent:
          (latestCall?.caller || latestCall?.admin || lead.assignedTo)?.name ||
          'Unassigned',
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
      const callLog = await this.prisma.callLog.update({
        where: { id },
        data: updateData,
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
      if (error.code === 'P2025') {
        throw new NotFoundException(`Call Log with ID ${id} not found`);
      }
      throw error;
    }
  }
}
