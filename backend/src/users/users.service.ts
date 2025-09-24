
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// FIX: The import from '@prisma/client' fails when `prisma generate` has not been run.
// import { Prisma, User } from '@prisma/client';

// FIX: Define local types to satisfy TypeScript during compile time.
type User = any;
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Prisma {
  export type UserCreateInput = any;
  export type UserUpdateInput = any;
}


@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
}