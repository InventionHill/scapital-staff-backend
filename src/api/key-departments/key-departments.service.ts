import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateKeyDepartmentDto } from './dto/create-key-department.dto';
import { UpdateKeyDepartmentDto } from './dto/update-key-department.dto';

@Injectable()
export class KeyDepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateKeyDepartmentDto) {
    try {
      return this.prisma.keyDepartment.create({
        data: createDto,
      });
    } catch (error) {
      throw error;
    }
  }

  findAll() {
    return this.prisma.keyDepartment.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.keyDepartment.findUnique({ where: { id } });
  }

  update(id: string, updateDto: UpdateKeyDepartmentDto) {
    return this.prisma.keyDepartment.update({
      where: { id },
      data: updateDto,
    });
  }

  remove(id: string) {
    return this.prisma.keyDepartment.delete({ where: { id } });
  }
}
