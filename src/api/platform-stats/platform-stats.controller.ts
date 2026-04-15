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
import { PlatformStatsService } from './platform-stats.service';
import { CreatePlatformStatDto } from './dto/create-platform-stat.dto';
import { UpdatePlatformStatDto } from './dto/update-platform-stat.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('platform-stats')
export class PlatformStatsController {
  constructor(private readonly service: PlatformStatsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() createDto: CreatePlatformStatDto) {
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
  update(@Param('id') id: string, @Body() updateDto: UpdatePlatformStatDto) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
