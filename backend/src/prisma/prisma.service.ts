import { Injectable, OnModuleInit } from '@nestjs/common';
// import { PrismaClient } from '@prisma/client'; // FIX: Replaced with require to solve type resolution error.

// FIX: Using require for PrismaClient due to module resolution issues.
const { PrismaClient } = require('@prisma/client');

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // FIX: Cast `this` to `any` to bypass TypeScript error. This seems to be due to
    // an issue with Prisma Client type generation in the environment.
    await (this as any).$connect();
  }
}
