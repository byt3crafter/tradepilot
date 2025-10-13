import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChecklistRuleDto } from './dtos/create-checklist-rule.dto';
import { UpdateChecklistRuleDto } from './dtos/update-checklist-rule.dto';

@Injectable()
export class ChecklistRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createChecklistRuleDto: CreateChecklistRuleDto) {
    return this.prisma.checklistRule.create({
      data: {
        ...createChecklistRuleDto,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.checklistRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const rule = await this.prisma.checklistRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Checklist rule with ID ${id} not found.`);
    }

    if (rule.userId !== userId) {
      throw new ForbiddenException('You are not authorized to access this rule.');
    }

    return rule;
  }

  async update(id: string, userId: string, updateChecklistRuleDto: UpdateChecklistRuleDto) {
    await this.findOne(id, userId); // Authorization check

    return this.prisma.checklistRule.update({
      where: { id },
      data: updateChecklistRuleDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Authorization check
    
    await this.prisma.checklistRule.delete({
      where: { id },
    });
    
    return { message: 'Checklist rule deleted successfully.' };
  }
}
