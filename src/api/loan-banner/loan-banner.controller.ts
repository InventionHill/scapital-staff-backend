import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
} from '@nestjs/common';
import { LoanBannerService } from './loan-banner.service';
import { CreateLoanBannerDto } from './dto/create-loan-banner.dto';
import { UpdateLoanBannerDto } from './dto/update-loan-banner.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('loan-banner')
export class LoanBannerController {
  constructor(private readonly service: LoanBannerService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() createDto: CreateLoanBannerDto) {
    return this.service.create(createDto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Put('reorder')
  @UseGuards(AuthGuard('jwt'))
  reorder(@Body() body: { ids: string[] }) {
    return this.service.reorder(body.ids);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id') id: string, @Body() updateDto: UpdateLoanBannerDto) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
