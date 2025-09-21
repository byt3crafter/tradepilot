import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { AdminStatsDto } from './dtos/admin-stats.dto';
import { AdminUserDto } from './dtos/admin-user.dto';

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
}
