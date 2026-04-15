import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  Delete,
} from '@nestjs/common';
import { LoanApplicationsService } from './loan-applications.service';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('loan-applications')
export class LoanApplicationsController {
  constructor(private readonly service: LoanApplicationsService) {}

  @Post()
  create(@Body() createDto: CreateLoanApplicationDto) {
    return this.service.create(createDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/status')
  @UseGuards(AuthGuard('jwt'))
  updateStatus(@Body() body: { status: string }, @Param('id') id: string) {
    return this.service.updateStatus(id, body.status);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
