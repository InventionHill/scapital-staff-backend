import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SectionContentService } from './section-content.service';
import { UpdateSectionContentDto } from './dto/update-section-content.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('section-content')
export class SectionContentController {
  constructor(private readonly service: SectionContentService) {}

  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.service.findOne(key);
  }

  @Post(':key')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('key') key: string,
    @Body() updateDto: UpdateSectionContentDto,
  ) {
    return this.service.update(key, updateDto);
  }
}
