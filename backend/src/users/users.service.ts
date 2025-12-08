
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

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
    await this.prisma.user.delete({
      where: { id },
    });
    return { message: 'User deleted successfully.' };
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
