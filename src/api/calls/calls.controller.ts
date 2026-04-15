import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Query,
  Patch,
  Param,
  Res,
} from '@nestjs/common';
import { CallsService } from './calls.service';
import { GroupedCreateCallDto } from './dto/grouped-create-call.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post('incoming')
  async create(@Body() dto: GroupedCreateCallDto) {
    return this.callsService.handleGroupedIncomingCalls(dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.callsService.findAll(
      startDate,
      endDate,
      assignedToId,
      search,
      status,
      page,
      limit,
    );
  }

  @Get('export')
  @UseGuards(AuthGuard('jwt'))
  async export(
    @Res() res: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const buffer = await this.callsService.exportCallLogs(
      startDate,
      endDate,
      assignedToId,
      search,
      status,
    );

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="call_logs_${new Date().toISOString().split('T')[0]}.xlsx"`,
      'Content-Length': buffer.byteLength,
    });

    res.end(buffer);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('id') id: string,
    @Body() updateData: { callerId: string },
  ) {
    return this.callsService.update(id, updateData);
  }
}
