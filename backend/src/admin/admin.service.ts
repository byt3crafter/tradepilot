import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { AdminStatsDto } from './dtos/admin-stats.dto';
import { AdminUserDto } from './dtos/admin-user.dto';
import { GrantProDto } from './dtos/grant-pro.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

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

    const dataToUpdate: any = {
        proAccessExpiresAt: grantProDto.expiresAt,
        proAccessReason: grantProDto.reason,
    };
    
    // If user is in trial, end the trial by setting status to CANCELED (no active paddle sub)
    // This makes the user state less ambiguous.
    if (user.subscriptionStatus === 'TRIALING') {
        dataToUpdate.subscriptionStatus = 'CANCELED';
        dataToUpdate.trialEndsAt = null;
    }

    const updatedUser = await (this.prisma as any).user.update({
        where: { id: userId },
        data: dataToUpdate,
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
            // Set expiresAt to a past date. Setting to 'null' grants lifetime access.
            proAccessExpiresAt: new Date(0), 
            proAccessReason: 'Access revoked by admin.',
        },
    });

    return plainToInstance(AdminUserDto, updatedUser, { excludeExtraneousValues: true });
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    return this.usersService.delete(userId);
  }
}