import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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

import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
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
        _count: {
          select: { referrals: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Sync names from Clerk if missing (lazy sync for Admin view)
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (secretKey) {
      await Promise.all(users.map(async (user) => {
        if (user.fullName === 'Trader' || !user.fullName) {
          try {
            const response = await fetch(`https://api.clerk.com/v1/users/${user.id}`, {
              headers: { 'Authorization': `Bearer ${secretKey}` }
            });
            if (response.ok) {
              const clerkUser = await response.json();
              const first = clerkUser.first_name || '';
              const last = clerkUser.last_name || '';
              const realName = `${first} ${last}`.trim();

              if (realName && realName !== 'Trader') {
                // Update in DB
                await this.prisma.user.update({
                  where: { id: user.id },
                  data: { fullName: realName }
                });
                // Update local object for return
                user.fullName = realName;
              }
            }
          } catch (e) {
            this.logger.warn(`Failed to sync name for user ${user.id}: ${e.message}`);
          }
        }
      }));
    }

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
        referralCount: user._count?.referrals || 0,
      }, {
        excludeExtraneousValues: true,
      });
    });
  }

  async grantLifetimeAccess(userId: string): Promise<AdminUserDto> {
    const user = await this.usersService.setLifetimeAccess(userId, true);
    return plainToInstance(AdminUserDto, user, { excludeExtraneousValues: true });
  }

  async extendTrial(userId: string, days: number): Promise<AdminUserDto> {
    const user = await this.usersService.extendTrial(userId, days);
    return plainToInstance(AdminUserDto, user, { excludeExtraneousValues: true });
  }

  async getReferralStats() {
    const totalReferrals = await this.prisma.user.count({
      where: { referredByUserId: { not: null } },
    });

    const topReferrers = await this.prisma.user.findMany({
      where: { referrals: { some: {} } },
      select: {
        id: true,
        fullName: true,
        email: true,
        _count: {
          select: { referrals: true },
        },
      },
      orderBy: {
        referrals: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    const recentReferrals = await this.prisma.user.findMany({
      where: { referredByUserId: { not: null } },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
        subscriptionStatus: true,
        hasRewardedReferrer: true,
        referrer: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      totalReferrals,
      topReferrers: topReferrers.map(u => ({ ...u, referralCount: u._count.referrals })),
      recentReferrals,
    };
  }

  async generateInvite(type: 'TRIAL' | 'LIFETIME', duration?: number) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    return this.prisma.inviteCode.create({
      data: {
        code,
        type,
        duration: type === 'TRIAL' ? duration : null,
      },
    });
  }

  async getInvites() {
    return this.prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        usedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
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