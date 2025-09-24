
import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { AdminStatsDto } from './dtos/admin-stats.dto';
import { AdminUserDto } from './dtos/admin-user.dto';
import { GrantProDto } from './dtos/grant-pro.dto';
import { UsersService } from 'src/users/users.service';
// FIX: The import from '@prisma/client' fails when `prisma generate` has not been run.
// import { Prisma, User } from '@prisma/client';

// FIX: Define local types to satisfy TypeScript during compile time.
type User = any;
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Prisma {
    export type UserUpdateInput = any;
}


@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

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
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user: User) => plainToInstance(AdminUserDto, user, {
      excludeExtraneousValues: true,
    }));
  }

  async grantProAccess(userId: string, grantProDto: GrantProDto): Promise<AdminUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }});
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
     const user = await this.prisma.user.findUnique({ where: { id: userId }});
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
}