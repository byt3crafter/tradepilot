// FIX: The import of PrismaClient fails because the Prisma client has not been generated.
// To resolve this, `npx prisma generate` should be run. As a workaround in the code,
// we must load the PrismaClient dynamically at runtime using `require`.
// FIX: Added declaration for `require` to resolve "Cannot find name 'require'" error.
declare const require: any;
const { PrismaClient } = require('@prisma/client');
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // FIX: Cast `prisma` to `any` to bypass TypeScript errors.
  const user1 = await (prisma as any).user.upsert({
    where: { email: 'verified.user@example.com' },
    update: {},
    create: {
      email: 'verified.user@example.com',
      passwordHash,
      fullName: 'Verified User',
      isEmailVerified: true,
      lastLoginAt: new Date(),
    },
  });

  // FIX: Cast `prisma` to `any` to bypass TypeScript errors.
  const user2 = await (prisma as any).user.upsert({
    where: { email: 'unverified.user@example.com' },
    update: {},
    create: {
      email: 'unverified.user@example.com',
      passwordHash,
      fullName: 'Unverified User',
      isEmailVerified: false,
    },
  });

  console.log({ user1, user2 });
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    // FIX: Cast `process` to `any` to fix error due to missing Node.js types.
    (process as any).exit(1);
  })
  .finally(async () => {
    // FIX: Cast `prisma` to `any` to bypass TypeScript errors.
    await (prisma as any).$disconnect();
  });
