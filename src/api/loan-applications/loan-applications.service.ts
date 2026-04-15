import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';

@Injectable()
export class LoanApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createDto: CreateLoanApplicationDto) {
    return this.prisma.loanApplication.create({
      data: createDto,
    });
  }

  findAll() {
    return this.prisma.loanApplication.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  updateStatus(id: string, status: string) {
    return this.prisma.loanApplication.update({
      where: { id },
      data: { status },
    });
  }

  findOne(id: string) {
    return this.prisma.loanApplication.findUnique({
      where: { id },
    });
  }

  remove(id: string) {
    return this.prisma.loanApplication.delete({
      where: { id },
    });
  }
}
