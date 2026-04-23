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
  Res,
  InternalServerErrorException,
  Logger,
  SetMetadata,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { LeadsService } from './leads.service';
import {
  UpdateLeadStatusDto,
  AssignLeadDto,
} from './dto/update-lead-status.dto';
import { CreateManualLeadDto } from './dto/create-manual-lead.dto';
import { ImportLeadsDto } from './dto/import-leads.dto';
import { CreateApplicationFormDto } from './dto/application-form.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('leads')
@UseGuards(AuthGuard('jwt'))
export class LeadsController {
  private readonly logger = new Logger(LeadsController.name);

  constructor(private readonly leadsService: LeadsService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importLeads(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    this.logger.log(
      `Lead Import Attempt: ${JSON.stringify({
        hasFile: !!file,
        fileName: file?.originalname,
        user: req.user?.userType,
      })}`,
    );

    // If a file is provided, use the file import logic
    if (file) {
      return this.leadsService.importLeadsFromFile(file, req.user);
    }

    // Fallback to JSON array import if no file is provided (for backward compatibility)
    const importLeadsDto = body as ImportLeadsDto;
    return this.leadsService.importLeads(importLeadsDto, req.user);
  }

  @Post('manual')
  async createManual(
    @Request() req,
    @Body() createManualLeadDto: CreateManualLeadDto,
  ) {
    this.logger.log(
      `Manual Lead Creation Attempt: ${JSON.stringify({
        body: createManualLeadDto,
        user: req.user,
      })}`,
    );
    return this.leadsService.createManual(createManualLeadDto, req.user);
  }

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
    @Query('branchId') branchId?: string,
  ) {
    return this.leadsService.findAll(
      req.user,
      status,
      startDate,
      endDate,
      assignedToId,
      branchId,
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
  async assign(
    @Request() req,
    @Param('id') id: string,
    @Body() assignLeadDto: AssignLeadDto,
  ) {
    return this.leadsService.assign(id, assignLeadDto, req.user);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    return this.leadsService.remove(id, req.user);
  }

  @Get(':id/application-form')
  async getApplicationForm(@Param('id') id: string) {
    return this.leadsService.getApplicationForm(id);
  }

  @Post(':id/application-form')
  async updateApplicationForm(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateApplicationFormDto,
  ) {
    this.logger.log(`UPDATING FORM - ID: ${id}`);
    this.logger.log(`UPDATING FORM - DTO: ${JSON.stringify(dto, null, 2)}`);
    return this.leadsService.updateApplicationForm(id, dto, req.user);
  }

  @Get(':id/application-form/pdf')
  @SetMetadata('keep-raw-response', true)
  async getApplicationFormPdf(@Param('id') id: string, @Res() res: Response) {
    try {
      const buffer = await this.leadsService.getApplicationFormPdf(id);

      if (!buffer || buffer.length === 0) {
        throw new InternalServerErrorException(
          'Generated PDF is empty or invalid',
        );
      }

      res.header('Content-Type', 'application/pdf');
      res.header(
        'Content-Disposition',
        `attachment; filename="application-form-${id}.pdf"`,
      );
      res.header('Content-Length', buffer.length.toString());

      res.status(200).send(buffer);
    } catch (error) {
      this.logger.error(
        `Controller PDF handling error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (!res.headersSent) {
        res.status(500).json({
          status: 'error',
          message:
            error instanceof Error ? error.message : 'Internal Server Error',
        });
      }
    }
  }
}
