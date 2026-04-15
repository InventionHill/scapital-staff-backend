import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@Injectable()
export class FaqsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateFaqDto) {
    const lastItem = await this.prisma.fAQ.findFirst({
      orderBy: { order: 'desc' },
    });
    const newOrder = (lastItem?.order ?? -1) + 1;

    return this.prisma.fAQ.create({
      data: {
        ...createDto,
        order: newOrder,
      } as any,
    });
  }

  findAll() {
    return this.prisma.fAQ.findMany({ orderBy: { order: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.fAQ.findUnique({ where: { id } });
  }

  update(id: string, updateDto: UpdateFaqDto) {
    return this.prisma.fAQ.update({
      where: { id },
      data: updateDto,
    });
  }

  remove(id: string) {
    return this.prisma.fAQ.delete({ where: { id } });
  }
}
