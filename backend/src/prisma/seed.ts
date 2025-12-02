import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const assetSpecifications = [
  // Forex Majors
  { symbol: 'EURUSD', name: 'Euro vs US Dollar', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
  { symbol: 'GBPUSD', name: 'Great British Pound vs US Dollar', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
  { symbol: 'USDJPY', name: 'US Dollar vs Japanese Yen', pipSize: 0.01, lotSize: 100000, valuePerPoint: 10 },
  { symbol: 'USDCAD', name: 'US Dollar vs Canadian Dollar', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
  { symbol: 'AUDUSD', name: 'Australian Dollar vs US Dollar', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar vs US Dollar', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
  { symbol: 'USDCHF', name: 'US Dollar vs Swiss Franc', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
  // Indices
  { symbol: 'US30', name: 'Dow Jones Industrial Average', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
  { symbol: 'SPX500', name: 'S&P 500', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
  { symbol: 'NAS100', name: 'Nasdaq 100', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
  { symbol: 'DE40', name: 'DAX 40 (Germany)', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
  { symbol: 'UK100', name: 'FTSE 100', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
  // Crypto
  { symbol: 'BTCUSD', name: 'Bitcoin vs US Dollar', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
  { symbol: 'ETHUSD', name: 'Ethereum vs US Dollar', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
  // Commodities
  { symbol: 'XAUUSD', name: 'Gold vs US Dollar', pipSize: 0.01, lotSize: 100, valuePerPoint: 10 },
  { symbol: 'XAGUSD', name: 'Silver vs US Dollar', pipSize: 0.001, lotSize: 5000, valuePerPoint: 50 },
  { symbol: 'USOIL', name: 'WTI Crude Oil', pipSize: 0.01, lotSize: 1000, valuePerPoint: 10 },
];

async function main() {
  console.log('Start seeding...');

  // Note: For Clerk integration, users are typically created via sign-up.
  // This seed creates dummy users for local testing if needed, using arbitrary IDs.

  const user1 = await prisma.user.upsert({
    where: { email: 'verified.user@example.com' },
    update: {},
    create: {
      id: 'seed_user_clerk_id_001', // Clerk User ID (simulated for seed)
      email: 'verified.user@example.com',
      fullName: 'Verified User',
      isEmailVerified: true,
      lastLoginAt: new Date(),
    },
  });

  console.log('Seeding Asset Specifications for user1...');
  for (const asset of assetSpecifications) {
    await prisma.assetSpecification.upsert({
      where: { userId_symbol: { userId: user1.id, symbol: asset.symbol } },
      update: {
        ...asset,
      },
      create: {
        ...asset,
        userId: user1.id
      },
    });
  }
  console.log('Asset Specifications seeded.');

  console.log({ user1 });
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    // FIX: Cast process to any to fix type error with process.exit
    (process as any).exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
