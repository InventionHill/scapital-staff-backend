import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';
import { CreateComparisonParameterDto } from './dto/create-comparison-parameter.dto';
import { UpdateComparisonValueDto } from './dto/update-comparison-value.dto';

@Injectable()
export class LoanComparisonService {
  constructor(private prisma: PrismaService) {}

  // Products
  async createProduct(dto: CreateLoanProductDto) {
    const lastItem = await this.prisma.loanProduct.findFirst({
      orderBy: { order: 'desc' },
    });
    const nextOrder = (lastItem?.order || 0) + 1;

    const { bankId, loanBannerId, ...rest } = dto;
    let { icon, applyUrl } = dto;
    let bankingPartnerId: string | undefined;

    if (bankId) {
      const partner = await this.prisma.bankingPartner.findUnique({
        where: { id: bankId },
      });
      if (!partner) {
        throw new NotFoundException(
          `Banking Partner with ID ${bankId} not found`,
        );
      }
      bankingPartnerId = partner.id;
      if (!icon) icon = partner.logoUrl;
      if (!applyUrl) applyUrl = partner.redirectUrl || undefined;
    }

    return this.prisma.loanProduct.create({
      data: {
        ...rest,
        icon,
        applyUrl,
        bankingPartnerId: bankingPartnerId || undefined,
        loanBannerId: loanBannerId || undefined,
        order: nextOrder,
      },
    });
  }

  async findAllProducts() {
    return this.prisma.loanProduct.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        icon: true,
        order: true,
        applyLabel: true,
        applyUrl: true,
        interestRate: true,
        processingFee: true,
        createdAt: true,
        updatedAt: true,
        loanBanner: true,
        loanBannerId: true,
        bankingPartner: true,
        bankingPartnerId: true,
        isActive: true,
        values: true,
      },
    });
  }

  async updateProduct(id: string, dto: any) {
    return this.prisma.loanProduct.update({ where: { id }, data: dto });
  }

  async removeProduct(id: string) {
    return this.prisma.loanProduct.delete({ where: { id } });
  }

  async reorderProducts(ids: string[]) {
    const updatePromises = ids.map((id, index) =>
      this.prisma.loanProduct.update({
        where: { id },
        data: { order: index + 1 },
      }),
    );
    return this.prisma.$transaction(updatePromises);
  }

  // Parameters
  async createParameter(dto: CreateComparisonParameterDto) {
    const lastItem = await this.prisma.comparisonParameter.findFirst({
      orderBy: { order: 'desc' },
    });
    const nextOrder = (lastItem?.order || 0) + 1;

    return this.prisma.comparisonParameter.create({
      data: { ...dto, order: nextOrder },
    });
  }

  async findAllParameters() {
    return this.prisma.comparisonParameter.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async updateParameter(id: string, dto: any) {
    return this.prisma.comparisonParameter.update({ where: { id }, data: dto });
  }

  async removeParameter(id: string) {
    return this.prisma.comparisonParameter.delete({ where: { id } });
  }

  async reorderParameters(items: { id: string; order: number }[]) {
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.comparisonParameter.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );
  }

  // Values
  async getComparisonValues() {
    // Return a map or list of values
    return this.prisma.comparisonValue.findMany();
  }

  async updateComparisonValue(dto: UpdateComparisonValueDto) {
    const [product, parameter] = await Promise.all([
      this.prisma.loanProduct.findUnique({ where: { id: dto.productId } }),
      this.prisma.comparisonParameter.findUnique({
        where: { id: dto.parameterId },
      }),
    ]);

    if (!product) {
      throw new NotFoundException(
        `Loan Product with ID ${dto.productId} not found`,
      );
    }
    if (!parameter) {
      throw new NotFoundException(
        `Comparison Parameter with ID ${dto.parameterId} not found`,
      );
    }

    return this.prisma.comparisonValue.upsert({
      where: {
        productId_parameterId: {
          productId: dto.productId,
          parameterId: dto.parameterId,
        },
      },
      update: { value: dto.value },
      create: {
        productId: dto.productId,
        parameterId: dto.parameterId,
        value: dto.value,
      },
    });
  }
}
