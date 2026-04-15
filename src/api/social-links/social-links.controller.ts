import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SocialLinksService } from './social-links.service';
import { CreateSocialLinkDto } from './dto/create-social-link.dto';
import { UpdateSocialLinkDto } from './dto/update-social-link.dto';

@Controller('social-links')
export class SocialLinksController {
  constructor(private readonly socialLinksService: SocialLinksService) {}

  @Post()
  create(@Body() createSocialLinkDto: CreateSocialLinkDto) {
    return this.socialLinksService.create(createSocialLinkDto);
  }

  @Get()
  findAll() {
    return this.socialLinksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.socialLinksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSocialLinkDto: UpdateSocialLinkDto,
  ) {
    return this.socialLinksService.update(id, updateSocialLinkDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.socialLinksService.remove(id);
  }
}
