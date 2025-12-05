import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { AdminStatsDto } from './dtos/admin-stats.dto';
import { AdminUserDto } from './dtos/admin-user.dto';
import { GrantProDto } from './dtos/grant-pro.dto';
import { UsersService } from '../users/users.service';
import { Prisma, User } from '@prisma/client';
import { CreatePropFirmTemplateDto } from './dtos/create-prop-firm-template.dto';
import { UpdatePropFirmTemplateDto } from './dtos/update-prop-firm-template.dto';
import { PropFirmTemplateDto } from './dtos/prop-firm-template.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) { }

  async getStats(): Promise<AdminStatsDto> {
    const totalUsers = await this.prisma.user.count();
    const activeSubscriptions = await this.prisma.user.count({
      where: { subscriptionStatus: 'ACTIVE' },
    });
    const trialUsers = await this.prisma.user.count({
      where: { subscriptionStatus: 'TRIALING' },
    });
    // Placeholder for MRR - this would be a more complex calculation
    // typically derived from Paddle/Stripe data or synced transactions.
    const mrr = activeSubscriptions * 19.0;

    return plainToInstance(AdminStatsDto, {
      totalUsers,
      activeSubscriptions,
      trialUsers,
      mrr,
    });
  }

  async getUsers(): Promise<AdminUserDto[]> {
    const users = await this.prisma.user.findMany({
      include: {
        apiUsage: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user: any) => {
      const apiUsageCost = user.apiUsage?.reduce((sum, usage) => sum + (usage.cost || 0), 0) || 0;
      const apiUsageTokens = user.apiUsage?.reduce((sum, usage) => sum + (usage.tokens || 0), 0) || 0;
      const lastApiUsage = user.apiUsage?.length > 0
        ? user.apiUsage.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0].timestamp
        : null;

      return plainToInstance(AdminUserDto, {
        ...user,
        apiUsageCost,
        apiUsageTokens,
        lastApiUsage,
      }, {
        excludeExtraneousValues: true,
      });
    });
  }

  async grantProAccess(userId: string, grantProDto: GrantProDto): Promise<AdminUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const dataToUpdate: Prisma.UserUpdateInput = {
      proAccessExpiresAt: grantProDto.expiresAt,
      proAccessReason: grantProDto.reason,
    };

    if (user.subscriptionStatus === 'TRIALING') {
      dataToUpdate.subscriptionStatus = 'CANCELED';
      dataToUpdate.trialEndsAt = null;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    return plainToInstance(AdminUserDto, updatedUser, { excludeExtraneousValues: true });
  }

  async revokeProAccess(userId: string): Promise<AdminUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        proAccessExpiresAt: new Date(0),
        proAccessReason: 'Access revoked by admin.',
      },
    });

    return plainToInstance(AdminUserDto, updatedUser, { excludeExtraneousValues: true });
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    return this.usersService.delete(userId);
  }

  // Prop Firm Templates CRUD
  async getAllTemplates(): Promise<PropFirmTemplateDto[]> {
    const templates = await this.prisma.propFirmTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return templates.map(template =>
      plainToInstance(PropFirmTemplateDto, template, { excludeExtraneousValues: true })
    );
  }

  async getTemplateById(id: string): Promise<PropFirmTemplateDto> {
    const template = await this.prisma.propFirmTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(`Prop firm template with ID ${id} not found.`);
    }
    return plainToInstance(PropFirmTemplateDto, template, { excludeExtraneousValues: true });
  }

  async createTemplate(dto: CreatePropFirmTemplateDto): Promise<PropFirmTemplateDto> {
    const template = await this.prisma.propFirmTemplate.create({
      data: dto,
    });
    return plainToInstance(PropFirmTemplateDto, template, { excludeExtraneousValues: true });
  }

  async updateTemplate(id: string, dto: UpdatePropFirmTemplateDto): Promise<PropFirmTemplateDto> {
    const existingTemplate = await this.prisma.propFirmTemplate.findUnique({
      where: { id },
    });
    if (!existingTemplate) {
      throw new NotFoundException(`Prop firm template with ID ${id} not found.`);
    }
    const updatedTemplate = await this.prisma.propFirmTemplate.update({
      where: { id },
      data: dto,
    });
    return plainToInstance(PropFirmTemplateDto, updatedTemplate, { excludeExtraneousValues: true });
  }

  async deleteTemplate(id: string): Promise<{ message: string }> {
    const template = await this.prisma.propFirmTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(`Prop firm template with ID ${id} not found.`);
    }
    await this.prisma.propFirmTemplate.delete({
      where: { id },
    });
    return { message: `Template ${template.name} deleted successfully.` };
  }
}