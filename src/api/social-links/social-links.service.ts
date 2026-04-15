import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSocialLinkDto } from './dto/create-social-link.dto';
import { UpdateSocialLinkDto } from './dto/update-social-link.dto';

@Injectable()
export class SocialLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSocialLinkDto: CreateSocialLinkDto) {
    // Check if platform already exists
    const existing = await this.prisma.socialLink.findUnique({
      where: {
        platform: createSocialLinkDto.platform,
      },
    });

    if (existing) {
      // If exists, update it instead of failing, or throw error.
      // User requirement: "in backend create new table for Social Facebook... link save only".
      // Usually upsert is better for "save settings" style.
      return this.prisma.socialLink.update({
        where: { id: existing.id },
        data: createSocialLinkDto,
      });
    }

    return this.prisma.socialLink.create({
      data: createSocialLinkDto,
    });
  }

  findAll() {
    return this.prisma.socialLink.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const socialLink = await this.prisma.socialLink.findUnique({
      where: { id },
    });
    if (!socialLink) throw new NotFoundException('Social link not found');
    return socialLink;
  }

  async update(id: string, updateSocialLinkDto: UpdateSocialLinkDto) {
    await this.findOne(id);
    return this.prisma.socialLink.update({
      where: { id },
      data: updateSocialLinkDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.socialLink.delete({
      where: { id },
    });
  }
}
