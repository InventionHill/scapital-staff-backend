import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSectionContentDto } from './dto/update-section-content.dto';

@Injectable()
export class SectionContentService {
  constructor(private prisma: PrismaService) {}

  async findOne(key: string) {
    return this.prisma.sectionContent.findUnique({
      where: { sectionKey: key },
    });
  }

  async update(key: string, updateDto: UpdateSectionContentDto) {
    return this.prisma.sectionContent.upsert({
      where: { sectionKey: key },
      update: {
        heading: updateDto.heading,
        highlightedText: updateDto.highlightedText,
        description: updateDto.description,
        isActive: updateDto.isActive,
        extraConfig: updateDto.extraConfig as any,
      },
      create: {
        sectionKey: key,
        heading: updateDto.heading,
        highlightedText: updateDto.highlightedText,
        description: updateDto.description,
        isActive: updateDto.isActive,
        extraConfig: updateDto.extraConfig as any,
      },
    });
  }
}
