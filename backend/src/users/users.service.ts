
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) { }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return user;
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<{ message: string }> {
    await this.findById(id); // Ensures user exists

    // Delete from Clerk first
    await this.deleteFromClerk(id);

    await this.prisma.user.delete({
      where: { id },
    });
    return { message: 'User deleted successfully.' };
  }

  private async deleteFromClerk(userId: string): Promise<void> {
    const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (!clerkSecretKey) {
      console.warn('CLERK_SECRET_KEY not found. Skipping Clerk user deletion.');
      return;
    }

    try {
      const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${clerkSecretKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`User ${userId} not found in Clerk. Proceeding with DB deletion.`);
          return;
        }
        const errorText = await response.text();
        throw new Error(`Failed to delete user from Clerk: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error deleting user from Clerk:', error);
      // We might want to throw here to prevent DB deletion if Clerk fails, 
      // but typically we want to allow cleanup if the user is already gone or there's a sync issue.
      // For now, let's throw to be safe and ensure manual intervention if needed.
      throw new Error(`Failed to delete user from Clerk: ${error.message}`);
    }
  }

  async setLifetimeAccess(id: string, isLifetime: boolean): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { isLifetimeAccess: isLifetime },
    });
  }

  async extendTrial(id: string, days: number): Promise<User> {
    const user = await this.findById(id);
    const currentTrialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : new Date();
    const basisDate = currentTrialEnd > new Date() ? currentTrialEnd : new Date();
    basisDate.setDate(basisDate.getDate() + days);

    return this.prisma.user.update({
      where: { id },
      data: {
        trialEndsAt: basisDate,
        subscriptionStatus: 'TRIALING' // Ensure status is trialing
      },
    });
  }
}
