"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
const assetSpecifications = [
    { symbol: 'EURUSD', name: 'Euro vs US Dollar' },
    { symbol: 'GBPUSD', name: 'Great British Pound vs US Dollar' },
    { symbol: 'USDJPY', name: 'US Dollar vs Japanese Yen' },
    { symbol: 'USDCAD', name: 'US Dollar vs Canadian Dollar' },
    { symbol: 'AUDUSD', name: 'Australian Dollar vs US Dollar' },
    { symbol: 'NZDUSD', name: 'New Zealand Dollar vs US Dollar' },
    { symbol: 'USDCHF', name: 'US Dollar vs Swiss Franc' },
    { symbol: 'US30', name: 'Dow Jones Industrial Average' },
    { symbol: 'SPX500', name: 'S&P 500' },
    { symbol: 'NAS100', name: 'Nasdaq 100' },
    { symbol: 'DE40', name: 'DAX 40 (Germany)' },
    { symbol: 'UK100', name: 'FTSE 100' },
    { symbol: 'BTCUSD', name: 'Bitcoin vs US Dollar' },
    { symbol: 'ETHUSD', name: 'Ethereum vs US Dollar' },
    { symbol: 'XAUUSD', name: 'Gold vs US Dollar' },
    { symbol: 'XAGUSD', name: 'Silver vs US Dollar' },
    { symbol: 'USOIL', name: 'WTI Crude Oil' },
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
                valuePerPoint: 1,
                pipSize: 1,
                lotSize: 1,
            },
            create: {
                ...asset,
                userId: user1.id,
                valuePerPoint: 1,
                pipSize: 1,
                lotSize: 1,
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
//# sourceMappingURL=seed.js.map