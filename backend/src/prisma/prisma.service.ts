
import { Injectable, OnModuleInit } from '@nestjs/common';
// FIX: Use require to import PrismaClient to work around module resolution issues.
// import { PrismaClient } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client');


@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}