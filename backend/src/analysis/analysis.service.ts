import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnalysisDto } from './dtos/create-analysis.dto';
import { UpdateAnalysisDto } from './dtos/update-analysis.dto';
import { BrokerAccountsService } from '../broker-accounts/broker-accounts.service';

@Injectable()
export class AnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: BrokerAccountsService,
  ) {}

  async create(userId: string, createDto: CreateAnalysisDto) {
    await this.accountsService.findOne(createDto.brokerId, userId); // Authorization check

    return this.prisma.analysis.create({
      data: {
        ...createDto,
        userId,
      },
    });
  }

  async findAllByAccount(userId: string, brokerAccountId: string) {
    await this.accountsService.findOne(brokerAccountId, userId); // Authorization check
    return this.prisma.analysis.findMany({
      where: {
        userId,
        brokerId: brokerAccountId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  
  async findOne(id: string, userId: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
    });

    if (!analysis) {
      throw new NotFoundException(`Analysis with ID ${id} not found.`);
    }

    if (analysis.userId !== userId) {
      throw new ForbiddenException('You are not authorized to access this analysis.');
    }

    return analysis;
  }

  async update(id: string, userId: string, updateDto: UpdateAnalysisDto) {
    await this.findOne(id, userId); // Authorization check

    return this.prisma.analysis.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Authorization check
    
    await this.prisma.analysis.delete({
      where: { id },
    });
    
    return { message: 'Analysis deleted successfully.' };
  }
}