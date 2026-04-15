import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeTestimonialDto } from './dto/create-employee-testimonial.dto';
import { UpdateEmployeeTestimonialDto } from './dto/update-employee-testimonial.dto';

@Injectable()
export class EmployeeTestimonialsService {
  constructor(private prisma: PrismaService) {}

  create(createDto: CreateEmployeeTestimonialDto) {
    return this.prisma.employeeTestimonial.create({
      data: createDto,
    });
  }

  findAll() {
    return this.prisma.employeeTestimonial.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.employeeTestimonial.findUnique({
      where: { id },
    });
  }

  update(id: string, updateDto: UpdateEmployeeTestimonialDto) {
    return this.prisma.employeeTestimonial.update({
      where: { id },
      data: updateDto,
    });
  }

  remove(id: string) {
    return this.prisma.employeeTestimonial.delete({
      where: { id },
    });
  }
}
