import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBankingPartnerDto } from './dto/create-banking-partner.dto';
import { UpdateBankingPartnerDto } from './dto/update-banking-partner.dto';

@Injectable()
export class BankingPartnersService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateBankingPartnerDto) {
    const lastItem = await this.prisma.bankingPartner.findFirst({
      orderBy: { order: 'desc' },
    });
    const newOrder = (lastItem?.order ?? -1) + 1;

    return this.prisma.bankingPartner.create({
      data: { ...createDto, order: newOrder },
    });
  }

  findAll() {
    return this.prisma.bankingPartner.findMany({ orderBy: { order: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.bankingPartner.findUnique({ where: { id } });
  }

  update(id: string, updateDto: UpdateBankingPartnerDto) {
    return this.prisma.bankingPartner.update({
      where: { id },
      data: updateDto,
    });
  }

  remove(id: string) {
    return this.prisma.bankingPartner.delete({ where: { id } });
  }

  async reorder(ids: string[]) {
    // Use transaction to update all items
    return this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.bankingPartner.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }
}
