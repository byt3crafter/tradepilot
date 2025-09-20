import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrokerAccountDto } from './dtos/create-broker-account.dto';
import { UpdateBrokerAccountDto } from './dtos/update-broker-account.dto';

@Injectable()
export class BrokerAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createBrokerAccountDto: CreateBrokerAccountDto) {
    return this.prisma.brokerAccount.create({
      data: {
        ...createBrokerAccountDto,
        initialBalance: createBrokerAccountDto.initialBalance,
        currentBalance: createBrokerAccountDto.initialBalance,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.brokerAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const account = await this.prisma.brokerAccount.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found.`);
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('You are not authorized to access this account.');
    }

    return account;
  }

  async update(id: string, userId: string, updateBrokerAccountDto: UpdateBrokerAccountDto) {
    await this.findOne(id, userId); // Authorization check

    return this.prisma.brokerAccount.update({
      where: { id },
      data: updateBrokerAccountDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Authorization check
    
    await this.prisma.brokerAccount.delete({
      where: { id },
    });
    
    return { message: 'Account deleted successfully.' };
  }
}
