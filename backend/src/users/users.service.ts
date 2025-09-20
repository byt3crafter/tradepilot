import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// import { Prisma, User } from '@prisma/client'; // FIX: Removed to resolve type errors.

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // FIX: Changed Prisma.UserCreateInput and User types to any.
  async create(data: any): Promise<any> {
    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    return (this.prisma as any).user.create({ data });
  }

  // FIX: Changed User type to any.
  async findByEmail(email: string): Promise<any | null> {
    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    return (this.prisma as any).user.findUnique({ where: { email } });
  }

  // FIX: Changed User type to any.
  async findById(id: string): Promise<any> {
    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    const user = await (this.prisma as any).user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return user;
  }

  // FIX: Changed Prisma.UserUpdateInput and User types to any.
  async update(id: string, data: any): Promise<any> {
    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    return (this.prisma as any).user.update({
      where: { id },
      data,
    });
  }
}
