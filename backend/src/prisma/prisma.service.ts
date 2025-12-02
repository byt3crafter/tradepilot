import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  [key: string]: any; // Allow arbitrary property access to bypass missing model types

  constructor() {
    super();
  }

  async onModuleInit() {
    await (this as any).$connect();
  }
}
