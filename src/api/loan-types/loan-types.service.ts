import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoanTypeDto } from './dto/create-loan-type.dto';
import { UpdateLoanTypeDto } from './dto/update-loan-type.dto';

@Injectable()
export class LoanTypesService {
  constructor(private prisma: PrismaService) {}

  async create(createLoanTypeDto: CreateLoanTypeDto, userId: string) {
    if (!userId) throw new UnauthorizedException('User identifier missing');
    try {
      const loanType = await this.prisma.loanType.create({
        data: {
          name: createLoanTypeDto.name,
          createdBy: userId,
        },
      });

      // Create documents sequentially to preserve order via createdAt
      if (
        createLoanTypeDto.documents &&
        createLoanTypeDto.documents.length > 0
      ) {
        for (const doc of createLoanTypeDto.documents) {
          await this.prisma.loanDocument.create({
            data: {
              name: doc.name,
              description: doc.description,
              loanTypeId: loanType.id,
            },
          });
        }
      }

      return loanType;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Loan type with this name already exists');
      }
      throw error;
    }
  }

  async findAll(user: any) {
    if (!user) throw new UnauthorizedException('User missing');
    const { id: userId, userType, branchId } = user;
    let targetAdminId = userId;

    if (userType === 'MOBILE') {
      const branchAdmin = await this.prisma.adminUser.findFirst({
        where: { branchId },
      });
      if (branchAdmin) {
        targetAdminId = branchAdmin.id;
      } else {
        return []; // No admin means no loan types configured
      }
    }

    return this.prisma.loanType.findMany({
      where: {
        createdBy: targetAdminId, // Strict isolation
      },
      orderBy: { createdAt: 'desc' },
      include: {
        documents: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { leads: true },
        },
      },
    });
  }

  async findOne(id: string, user: any) {
    if (!user) throw new UnauthorizedException('User missing');
    const { id: userId, userType, branchId } = user;
    let targetAdminId = userId;

    if (userType === 'MOBILE') {
      const branchAdmin = await this.prisma.adminUser.findFirst({
        where: { branchId },
      });
      if (branchAdmin) {
        targetAdminId = branchAdmin.id;
      }
    }

    const loanType = await this.prisma.loanType.findFirst({
      where: {
        id,
        createdBy: targetAdminId, // Strict isolation
      },
      include: {
        documents: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { leads: true },
        },
      },
    });
    if (!loanType) throw new NotFoundException('Loan type not found');
    return loanType;
  }

  async update(
    id: string,
    updateLoanTypeDto: UpdateLoanTypeDto,
    userId: string,
  ) {
    if (!userId) throw new UnauthorizedException('User identifier missing');
    try {
      // Security check: ensure the user owns the loan type
      await this.findOne(id, userId);

      return await this.prisma.$transaction(async (tx) => {
        // If documents are provided, we replace the entire list to stay in sync with UI
        if (updateLoanTypeDto.documents) {
          const providedIds = updateLoanTypeDto.documents
            .map((d) => (d as any).id)
            .filter((id) => !!id);

          // Delete documents not in the provided request
          await tx.loanDocument.deleteMany({
            where: {
              loanTypeId: id,
              id: { notIn: providedIds },
            },
          });

          // Update existing or create new sequentially
          for (const doc of updateLoanTypeDto.documents) {
            const docId = (doc as any).id;
            if (docId) {
              await tx.loanDocument.update({
                where: { id: docId },
                data: {
                  name: doc.name,
                  description: doc.description,
                },
              });
            } else {
              await tx.loanDocument.create({
                data: {
                  name: doc.name,
                  description: doc.description,
                  loanTypeId: id,
                },
              });
            }
          }
        }

        await tx.loanType.update({
          where: { id },
          data: {
            ...(updateLoanTypeDto.name && { name: updateLoanTypeDto.name }),
          },
        });

        return await tx.loanType.findUnique({
          where: { id },
          include: {
            documents: {
              orderBy: { createdAt: 'asc' },
            },
          },
        });
      });
    } catch (error) {
      if (error.code === 'P2025' || error instanceof NotFoundException)
        throw new NotFoundException('Loan type not found');
      if (error.code === 'P2002')
        throw new ConflictException('Loan type name already exists');
      throw error;
    }
  }

  async remove(id: string, userId: string) {
    if (!userId) throw new UnauthorizedException('User identifier missing');
    try {
      // Security check: ensure the user owns the loan type
      await this.findOne(id, userId);

      return await this.prisma.loanType.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025' || error instanceof NotFoundException)
        throw new NotFoundException('Loan type not found');
      throw error;
    }
  }
}
