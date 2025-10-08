

import { Injectable, OnModuleInit } from '@nestjs/common';
// FIX: Use named import for PrismaClient to ensure the class is correctly extended.
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}