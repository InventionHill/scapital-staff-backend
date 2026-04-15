import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { EmployeeTestimonialsService } from './employee-testimonials.service';
import { CreateEmployeeTestimonialDto } from './dto/create-employee-testimonial.dto';
import { UpdateEmployeeTestimonialDto } from './dto/update-employee-testimonial.dto';

@Controller('employee-testimonials')
export class EmployeeTestimonialsController {
  constructor(private readonly service: EmployeeTestimonialsService) {}

  @Post()
  create(@Body() createDto: CreateEmployeeTestimonialDto) {
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

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEmployeeTestimonialDto,
  ) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
