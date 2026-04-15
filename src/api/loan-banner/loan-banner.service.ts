import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoanBannerDto } from './dto/create-loan-banner.dto';
import { UpdateLoanBannerDto } from './dto/update-loan-banner.dto';

@Injectable()
export class LoanBannerService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateLoanBannerDto) {
    if (createDto.isDefault) {
      await this.prisma.loanBanner.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Auto-increment order
    const lastItem = await this.prisma.loanBanner.findFirst({
      orderBy: { order: 'desc' },
    });
    const newOrder = (lastItem?.order ?? -1) + 1;

    return this.prisma.loanBanner.create({
      data: {
        ...createDto,
        order: newOrder,
      } as any,
    });
  }

  findAll() {
    return this.prisma.loanBanner.findMany({ orderBy: { order: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.loanBanner.findUnique({ where: { id } });
  }

  async update(id: string, updateDto: UpdateLoanBannerDto) {
    if (updateDto.isDefault) {
      await this.prisma.loanBanner.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
    return this.prisma.loanBanner.update({
      where: { id },
      data: updateDto as any,
    });
  }

  async remove(id: string) {
    const existingProducts = await this.prisma.loanProduct.findMany({
      where: { loanBannerId: id },
      select: { name: true },
    });

    if (existingProducts.length > 0) {
      const productNames = existingProducts.map((p) => p.name).join(', ');
      throw new BadRequestException(
        `Cannot delete this Loan Showcase because it is assigned to the following Loan Products: ${productNames}. Please reassign or delete these products first.`,
      );
    }

    return this.prisma.loanBanner.delete({ where: { id } });
  }

  async reorder(ids: string[]) {
    const updatePromises = ids.map((id, index) =>
      this.prisma.loanBanner.update({
        where: { id },
        data: { order: index },
      }),
    );
    return Promise.all(updatePromises);
  }
}
