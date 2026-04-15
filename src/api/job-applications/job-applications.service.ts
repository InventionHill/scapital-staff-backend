import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';

@Injectable()
export class JobApplicationsService {
  constructor(private prisma: PrismaService) {}

  async create(createJobApplicationDto: CreateJobApplicationDto) {
    return this.prisma.jobApplication.create({
      data: createJobApplicationDto,
    });
  }

  async findAll() {
    return this.prisma.jobApplication.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.jobApplication.findUnique({
      where: { id },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.jobApplication.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: string) {
    return this.prisma.jobApplication.delete({
      where: { id },
    });
  }
}
