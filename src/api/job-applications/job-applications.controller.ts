import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JobApplicationsService } from './job-applications.service';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Job Applications')
@Controller('job-applications')
export class JobApplicationsController {
  constructor(
    private readonly jobApplicationsService: JobApplicationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job application' })
  create(@Body() createJobApplicationDto: CreateJobApplicationDto) {
    return this.jobApplicationsService.create(createJobApplicationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all job applications' })
  findAll() {
    return this.jobApplicationsService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get a single job application by ID' })
  findOne(@Param('id') id: string) {
    return this.jobApplicationsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update the status of a job application' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.jobApplicationsService.updateStatus(id, body.status);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete a job application' })
  remove(@Param('id') id: string) {
    return this.jobApplicationsService.remove(id);
  }
}
