import { Injectable, OnModuleInit } from '@nestjs/common';
// FIX: Changed import to wildcard to resolve module member issues.
import * as client from '@prisma/client';

@Injectable()
export class PrismaService extends client.PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}