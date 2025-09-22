import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { AdminStatsDto } from './dtos/admin-stats.dto';
import { AdminUserDto } from './dtos/admin-user.dto';
import { GrantProDto } from './dtos/grant-pro.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<AdminStatsDto> {
    const totalUsers = await (this.prisma as any).user.count();
    const activeSubscriptions = await (this.prisma as any).user.count({
      where: { subscriptionStatus: 'ACTIVE' },
    });
    const trialUsers = await (this.prisma as any).user.count({
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
    const users = await (this.prisma as any).user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    // FIX: The `users` variable is of type `any` due to wider Prisma type issues.
    // We cast it to `any[]` to ensure TypeScript selects the correct `plainToInstance` overload
    // that returns an array of DTOs, matching the function's return signature.
    return plainToInstance(AdminUserDto, users as any[], {
      excludeExtraneousValues: true,
    });
  }

  async grantProAccess(userId: string, grantProDto: GrantProDto): Promise<AdminUserDto> {
    const user = await (this.prisma as any).user.findUnique({ where: { id: userId }});
    if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const updatedUser = await (this.prisma as any).user.update({
        where: { id: userId },
        data: {
            proAccessExpiresAt: grantProDto.expiresAt,
            proAccessReason: grantProDto.reason,
        },
    });

    return plainToInstance(AdminUserDto, updatedUser, { excludeExtraneousValues: true });
  }

  async revokeProAccess(userId: string): Promise<AdminUserDto> {
     const user = await (this.prisma as any).user.findUnique({ where: { id: userId }});
    if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const updatedUser = await (this.prisma as any).user.update({
        where: { id: userId },
        data: {
            proAccessExpiresAt: null,
            proAccessReason: null,
        },
    });

    return plainToInstance(AdminUserDto, updatedUser, { excludeExtraneousValues: true });
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    const user = await (this.prisma as any).user.findUnique({ where: { id: userId }});
    if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    await (this.prisma as any).user.delete({
        where: { id: userId },
    });

    return { message: `User ${user.email} has been deleted successfully.` };
  }
}