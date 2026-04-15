import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlatformStatDto } from './dto/create-platform-stat.dto';
import { UpdatePlatformStatDto } from './dto/update-platform-stat.dto';

@Injectable()
export class PlatformStatsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreatePlatformStatDto) {
    const lastItem = await this.prisma.platformStat.findFirst({
      orderBy: { order: 'desc' },
    });
    const newOrder = (lastItem?.order ?? -1) + 1;

    return this.prisma.platformStat.create({
      data: { ...createDto, order: newOrder },
    });
  }

  findAll() {
    return this.prisma.platformStat.findMany({ orderBy: { order: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.platformStat.findUnique({ where: { id } });
  }

  update(id: string, updateDto: UpdatePlatformStatDto) {
    return this.prisma.platformStat.update({
      where: { id },
      data: updateDto,
    });
  }

  remove(id: string) {
    return this.prisma.platformStat.delete({ where: { id } });
  }

  async reorder(ids: string[]) {
    return this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.platformStat.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }
}
