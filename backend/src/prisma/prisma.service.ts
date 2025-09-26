import { Injectable, OnModuleInit } from '@nestjs/common';
// FIX: Standardized to named import for PrismaClient to resolve type errors.
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}