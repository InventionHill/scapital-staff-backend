import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

@Injectable()
export class BlogsService {
  constructor(private prisma: PrismaService) {}

  create(createDto: CreateBlogDto) {
    return this.prisma.blog.create({
      data: createDto,
    });
  }

  findAll(query?: { isPopular?: string; isActive?: string }) {
    const where: any = {};
    if (query?.isPopular) {
      where.isPopular = query.isPopular === 'true';
    }
    if (query?.isActive) {
      where.isActive = query.isActive === 'true';
    }

    return this.prisma.blog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.blog.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.blog.findUnique({ where: { slug } });
  }

  update(id: string, updateDto: UpdateBlogDto) {
    return this.prisma.blog.update({
      where: { id },
      data: updateDto,
    });
  }

  remove(id: string) {
    return this.prisma.blog.delete({ where: { id } });
  }
}
