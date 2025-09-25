import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// FIX: Changed import to wildcard to resolve module member issues.
import * as client from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: client.Prisma.UserCreateInput): Promise<client.User> {
    return this.prisma.user.create({ data });
  }

  async findByEmail(email: string): Promise<client.User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<client.User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return user;
  }

  async update(id: string, data: client.Prisma.UserUpdateInput): Promise<client.User> {
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
}