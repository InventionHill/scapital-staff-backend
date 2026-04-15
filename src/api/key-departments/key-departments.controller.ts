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
import { KeyDepartmentsService } from './key-departments.service';
import { CreateKeyDepartmentDto } from './dto/create-key-department.dto';
import { UpdateKeyDepartmentDto } from './dto/update-key-department.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('key-departments')
export class KeyDepartmentsController {
  constructor(private readonly service: KeyDepartmentsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() createDto: CreateKeyDepartmentDto) {
    return this.service.create(createDto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id') id: string, @Body() updateDto: UpdateKeyDepartmentDto) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
