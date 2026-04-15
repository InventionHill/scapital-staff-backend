import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoanTypeDto, UpdateLoanTypeDto } from './dto/loan-types.dto';

@Injectable()
export class LoanTypesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.loanType.findMany({
      include: {
        documents: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const loanType = await this.prisma.loanType.findUnique({
      where: { id },
      include: {
        documents: true,
      },
    });
    if (!loanType) throw new NotFoundException('Loan type not found');
    return loanType;
  }

  async create(dto: CreateLoanTypeDto) {
    try {
      return await this.prisma.loanType.create({
        data: {
          name: dto.name,
          documents: {
            create: dto.documents || [],
          },
        },
        include: {
          documents: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Loan type name already exists');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateLoanTypeDto) {
    const loanType = await this.prisma.loanType.findUnique({ where: { id } });
    if (!loanType) throw new NotFoundException('Loan type not found');

    try {
      // For simplicity in updates with nested documents, we'll delete old and create new
      // Or we could do more complex logic to update existing ones.
      // Given the requirement is a "list" of documents, typically replacing them is fine for this UI.

      const updateData: any = {
        name: dto.name || loanType.name,
      };

      if (dto.documents) {
        updateData.documents = {
          deleteMany: {},
          create: dto.documents,
        };
      }

      return await this.prisma.loanType.update({
        where: { id },
        data: updateData,
        include: {
          documents: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Loan type name already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const loanType = await this.prisma.loanType.findUnique({ where: { id } });
    if (!loanType) throw new NotFoundException('Loan type not found');

    return this.prisma.loanType.delete({
      where: { id },
    });
  }
}
