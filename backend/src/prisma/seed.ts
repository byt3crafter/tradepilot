
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const user1 = await prisma.user.upsert({
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

  const user2 = await prisma.user.upsert({
    where: { email: 'unverified.user@example.com' },
    update: {},
    create: {
      email: 'unverified.user@example.com',
      passwordHash,
      fullName: 'Unverified User',
      isEmailVerified: false,
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


  console.log({ user1, user2 });
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
