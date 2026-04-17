import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(createBranchDto: CreateBranchDto) {
    try {
      return await this.prisma.branch.create({
        data: createBranchDto,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Branch name already exists');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.branch.findMany({
      include: {
        _count: {
          select: {
            admins: true,
            mobileUsers: true,
            leads: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        _count: true,
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async update(id: string, updateBranchDto: UpdateBranchDto) {
    try {
      return await this.prisma.branch.update({
        where: { id },
        data: updateBranchDto,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Branch name already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Branch not found');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      // Check if branch has associated records
      const branch = await this.prisma.branch.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              admins: true,
              mobileUsers: true,
              leads: true,
            },
          },
        },
      });

      if (!branch) throw new NotFoundException('Branch not found');

      const count = branch._count;
      if (count.admins > 0 || count.mobileUsers > 0 || count.leads > 0) {
        throw new ConflictException(
          'Cannot delete branch with associated users or leads',
        );
      }

      return await this.prisma.branch.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw error;
    }
  }
}
