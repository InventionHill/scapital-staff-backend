import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Query,
} from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('blogs')
export class BlogsController {
  constructor(private readonly service: BlogsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() createDto: CreateBlogDto) {
    return this.service.create(createDto);
  }

  @Get()
  findAll(@Query() query: { isPopular?: string; isActive?: string }) {
    return this.service.findAll(query);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id') id: string, @Body() updateDto: UpdateBlogDto) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
