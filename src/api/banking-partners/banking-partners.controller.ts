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
import { BankingPartnersService } from './banking-partners.service';
import { CreateBankingPartnerDto } from './dto/create-banking-partner.dto';
import { UpdateBankingPartnerDto } from './dto/update-banking-partner.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('banking-partners')
export class BankingPartnersController {
  constructor(private readonly service: BankingPartnersService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() createDto: CreateBankingPartnerDto) {
    return this.service.create(createDto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put('reorder')
  @UseGuards(AuthGuard('jwt'))
  reorder(@Body() body: { ids: string[] }) {
    return this.service.reorder(body.ids);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id') id: string, @Body() updateDto: UpdateBankingPartnerDto) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
