import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';

@Injectable()
export class TestimonialsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateTestimonialDto) {
    const lastItem = await this.prisma.clientTestimonial.findFirst({
      orderBy: { order: 'desc' },
    });
    const newOrder = (lastItem?.order ?? -1) + 1;

    return this.prisma.clientTestimonial.create({
      data: {
        ...createDto,
        order: newOrder,
      } as any,
    });
  }

  findAll() {
    return this.prisma.clientTestimonial.findMany({
      orderBy: { order: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.clientTestimonial.findUnique({ where: { id } });
  }

  update(id: string, updateDto: UpdateTestimonialDto) {
    return this.prisma.clientTestimonial.update({
      where: { id },
      data: updateDto,
    });
  }

  remove(id: string) {
    return this.prisma.clientTestimonial.delete({ where: { id } });
  }
}
