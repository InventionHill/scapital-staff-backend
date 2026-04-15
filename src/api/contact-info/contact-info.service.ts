import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateContactInfoDto } from './dto/create-contact-info.dto';
import { UpdateContactInfoDto } from './dto/update-contact-info.dto';

@Injectable()
export class ContactInfoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createContactInfoDto: CreateContactInfoDto) {
    return this.prisma.contactInfo.create({
      data: createContactInfoDto,
    });
  }

  async findAll() {
    return this.prisma.contactInfo.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.contactInfo.findUnique({
      where: { id },
    });
  }

  async findFirstActive() {
    return this.prisma.contactInfo.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, updateContactInfoDto: UpdateContactInfoDto) {
    return this.prisma.contactInfo.update({
      where: { id },
      data: updateContactInfoDto,
    });
  }

  async remove(id: string) {
    return this.prisma.contactInfo.delete({
      where: { id },
    });
  }
}
