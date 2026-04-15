import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import {
  UpdateLeadStatusDto,
  AssignLeadDto,
} from './dto/update-lead-status.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('leads')
@UseGuards(AuthGuard('jwt'))
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('stats')
  getStats(@Request() req) {
    return this.leadsService.getStats(req.user);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('assignedToId') assignedToId?: string,
  ) {
    return this.leadsService.findAll(
      req.user,
      status,
      startDate,
      endDate,
      assignedToId,
    );
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const lead = await this.leadsService.findOne(id, req.user);
    const { callLogs, ...leadData } = lead as any;
    return {
      calllogs: callLogs,
      lead: leadData,
    };
  }

  @Post(':id/call-result')
  async updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() updateLeadStatusDto: UpdateLeadStatusDto,
  ) {
    return this.leadsService.updateStatus(id, updateLeadStatusDto, req.user);
  }

  @Patch(':id/assign')
  async assign(@Param('id') id: string, @Body() assignLeadDto: AssignLeadDto) {
    return this.leadsService.assign(id, assignLeadDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }
}
