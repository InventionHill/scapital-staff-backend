import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoanTypeDto } from './dto/create-loan-type.dto';
import { UpdateLoanTypeDto } from './dto/update-loan-type.dto';

@Injectable()
export class LoanTypesService {
  constructor(private prisma: PrismaService) {}

  async create(createLoanTypeDto: CreateLoanTypeDto) {
    try {
      return await this.prisma.loanType.create({
        data: {
          name: createLoanTypeDto.name,
          documents: {
            create:
              createLoanTypeDto.documents?.map((doc) => ({
                name: doc.name,
                description: doc.description,
              })) || [],
          },
        },
        include: { documents: true },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Loan type with this name already exists');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.loanType.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        documents: true,
        _count: {
          select: { leads: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const loanType = await this.prisma.loanType.findUnique({
      where: { id },
      include: {
        documents: true,
        _count: {
          select: { leads: true },
        },
      },
    });
    if (!loanType) throw new NotFoundException('Loan type not found');
    return loanType;
  }

  async update(id: string, updateLoanTypeDto: UpdateLoanTypeDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // If documents are provided, we replace the entire list to stay in sync with UI
        if (updateLoanTypeDto.documents) {
          await tx.loanDocument.deleteMany({
            where: { loanTypeId: id },
          });
        }

        return await tx.loanType.update({
          where: { id },
          data: {
            ...(updateLoanTypeDto.name && { name: updateLoanTypeDto.name }),
            ...(updateLoanTypeDto.documents && {
              documents: {
                create: updateLoanTypeDto.documents.map((doc) => ({
                  name: doc.name,
                  description: doc.description,
                })),
              },
            }),
          },
          include: { documents: true },
        });
      });
    } catch (error) {
      if (error.code === 'P2025')
        throw new NotFoundException('Loan type not found');
      if (error.code === 'P2002')
        throw new ConflictException('Loan type name already exists');
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.loanType.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025')
        throw new NotFoundException('Loan type not found');
      throw error;
    }
  }
}
