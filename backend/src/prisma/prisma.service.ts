
import { Injectable, OnModuleInit } from '@nestjs/common';
// FIX: Use namespace import for PrismaClient to resolve type and property access errors.
import * as pc from '@prisma/client';

@Injectable()
export class PrismaService extends pc.PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}