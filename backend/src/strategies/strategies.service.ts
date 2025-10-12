import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStrategyDto } from './dtos/create-strategy.dto';
import { UpdateStrategyDto } from './dtos/update-strategy.dto';

@Injectable()
export class StrategiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createStrategyDto: CreateStrategyDto) {
    return (this.prisma as any).strategy.create({
      data: {
        ...createStrategyDto,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return (this.prisma as any).strategy.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const strategy = await (this.prisma as any).strategy.findUnique({
      where: { id },
    });

    if (!strategy) {
      throw new NotFoundException(`Strategy with ID ${id} not found.`);
    }

    if (strategy.userId !== userId) {
      throw new ForbiddenException('You are not authorized to access this strategy.');
    }

    return strategy;
  }

  async update(id: string, userId: string, updateStrategyDto: UpdateStrategyDto) {
    await this.findOne(id, userId); // Authorization check

    return (this.prisma as any).strategy.update({
      where: { id },
      data: updateStrategyDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Authorization check
    
    await (this.prisma as any).strategy.delete({
      where: { id },
    });
    
    return { message: 'Strategy deleted successfully.' };
  }
}
