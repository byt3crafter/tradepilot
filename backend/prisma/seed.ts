// FIX: Use a named import for PrismaClient to resolve module resolution errors.
import { PrismaClient } from '@prisma/client';

// FIX: Instantiate the imported PrismaClient.
const prisma = new PrismaClient();

const assetSpecifications = [
  // Forex Majors
  { symbol: 'EURUSD', name: 'Euro vs US Dollar' },
  { symbol: 'GBPUSD', name: 'Great British Pound vs US Dollar' },
  { symbol: 'USDJPY', name: 'US Dollar vs Japanese Yen' },
  { symbol: 'USDCAD', name: 'US Dollar vs Canadian Dollar' },
  { symbol: 'AUDUSD', name: 'Australian Dollar vs US Dollar' },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar vs US Dollar' },
  { symbol: 'USDCHF', name: 'US Dollar vs Swiss Franc' },
  // Indices
  { symbol: 'US30', name: 'Dow Jones Industrial Average' },
  { symbol: 'SPX500', name: 'S&P 500' },
  { symbol: 'NAS100', name: 'Nasdaq 100' },
  { symbol: 'DE40', name: 'DAX 40 (Germany)' },
  { symbol: 'UK100', name: 'FTSE 100' },
  // Crypto
  { symbol: 'BTCUSD', name: 'Bitcoin vs US Dollar' },
  { symbol: 'ETHUSD', name: 'Ethereum vs US Dollar' },
  // Commodities
  { symbol: 'XAUUSD', name: 'Gold vs US Dollar' },
  { symbol: 'XAGUSD', name: 'Silver vs US Dollar' },
  { symbol: 'USOIL', name: 'WTI Crude Oil' },
];

async function main() {
  console.log('Start seeding...');

  // Note: Using Clerk for auth, so users are created via Clerk, not directly in the database
  // These are mock Clerk user IDs for seeding purposes
  const user1 = await prisma.user.upsert({
    where: { email: 'verified.user@example.com' },
    update: {},
    create: {
      id: 'user_seed_verified_123',
      email: 'verified.user@example.com',
      fullName: 'Verified User',
      isEmailVerified: true,
      lastLoginAt: new Date(),
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'unverified.user@example.com' },
    update: {},
    create: {
      id: 'user_seed_unverified_456',
      email: 'unverified.user@example.com',
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

  console.log('Asset Specifications seeded.');

  console.log('Seeding Example Playbooks...');

  // Playbook 1: Trend Following
  await prisma.playbook.create({
    data: {
      name: 'Trend Surfer Pro',
      coreIdea: 'Ride the trend until it bends. Focus on pullbacks in established trends.',
      userId: user1.id,
      tradingStyles: ['Swing', 'Day'],
      instruments: ['EURUSD', 'GBPUSD', 'US30'],
      timeframes: ['1h', '4h', 'Daily'],
      pros: ['High R:R ratio', 'Less screen time', 'Follows big money'],
      cons: ['Lower win rate', 'Requires patience', 'Whipsaws in ranging markets'],
      isPublic: true,
      setups: {
        create: [
          {
            name: 'EMA Pullback',
            riskSettings: { riskPercent: 1.0, stopLossType: 'Below Swing Low' },
            checklistItems: {
              create: [
                { text: 'Price is above 50 EMA', type: 'ENTRY_CRITERIA' },
                { text: 'Price pulls back to 20 EMA', type: 'ENTRY_CRITERIA' },
                { text: 'Bullish engulfing candle forms', type: 'ENTRY_CRITERIA' },
                { text: 'RSI > 50', type: 'CONFIRMATION_FILTERS' },
                { text: 'No major news in next 2 hours', type: 'CONFIRMATION_FILTERS' },
                { text: 'Stop loss below recent swing low', type: 'RISK_MANAGEMENT' },
                { text: 'Target 2R minimum', type: 'RISK_MANAGEMENT' },
                { text: 'Exit half at 1:1 R:R', type: 'EXIT_RULES' },
                { text: 'Trail stop to breakeven after TP1', type: 'EXIT_RULES' },
              ]
            }
          },
          {
            name: 'Breakout & Retest',
            riskSettings: { riskPercent: 0.5, stopLossType: 'Below Breakout Candle' },
            checklistItems: {
              create: [
                { text: 'Clear resistance level identified', type: 'ENTRY_CRITERIA' },
                { text: 'Strong breakout candle closes above level', type: 'ENTRY_CRITERIA' },
                { text: 'Price retests the broken level', type: 'ENTRY_CRITERIA' },
                { text: 'Volume spike on breakout', type: 'CONFIRMATION_FILTERS' },
                { text: 'Stop loss below breakout candle', type: 'RISK_MANAGEMENT' },
                { text: 'Target next resistance zone', type: 'RISK_MANAGEMENT' },
                { text: 'Exit if price closes back below level', type: 'EXIT_RULES' },
              ]
            }
          }
        ]
      }
    }
  });

  // Playbook 2: Reversal Master
  await prisma.playbook.create({
    data: {
      name: 'Reversal Master',
      coreIdea: 'Catching tops and bottoms at key supply and demand zones.',
      userId: user1.id,
      tradingStyles: ['Swing'],
      instruments: ['XAUUSD', 'USDCAD'],
      timeframes: ['4h', 'Daily'],
      pros: ['Sniper entries', 'Tight stops', 'High reward potential'],
      cons: ['Counter-trend is risky', 'Requires precise execution'],
      isPublic: true,
      setups: {
        create: [
          {
            name: 'Double Top/Bottom',
            riskSettings: { riskPercent: 2.0, stopLossType: 'Above/Below Structure' },
            checklistItems: {
              create: [
                { text: 'Price hits key support/resistance twice', type: 'ENTRY_CRITERIA' },
                { text: 'Neckline break', type: 'ENTRY_CRITERIA' },
                { text: 'Divergence on RSI', type: 'CONFIRMATION_FILTERS' },
                { text: 'Stop loss above the double top highs', type: 'RISK_MANAGEMENT' },
                { text: 'Target equal to pattern height', type: 'RISK_MANAGEMENT' },
                { text: 'Exit on structure break failure', type: 'EXIT_RULES' },
              ]
            }
          }
        ]
      }
    }
  });

  // Playbook 3: Scalp Ninja
  await prisma.playbook.create({
    data: {
      name: 'Scalp Ninja',
      coreIdea: 'Quick in and out trades capturing small moves in high volatility.',
      userId: user1.id,
      tradingStyles: ['Scalping'],
      instruments: ['NAS100', 'BTCUSD'],
      timeframes: ['1m', '5m'],
      pros: ['Quick profits', 'No overnight risk', 'Action packed'],
      cons: ['High stress', 'Commissions eat profits', 'Needs fast internet'],
      isPublic: true,
      setups: {
        create: [
          {
            name: '1-Minute Momentum',
            riskSettings: { riskPercent: 0.25, stopLossType: 'Fixed Pips' },
            checklistItems: {
              create: [
                { text: 'Strong momentum candle', type: 'ENTRY_CRITERIA' },
                { text: 'Break of recent 5-candle high', type: 'ENTRY_CRITERIA' },
                { text: 'Align with 5m trend', type: 'CONFIRMATION_FILTERS' },
                { text: 'Stop loss 10 points fixed', type: 'RISK_MANAGEMENT' },
                { text: 'Target 15 points fixed', type: 'RISK_MANAGEMENT' },
                { text: 'Exit immediately if momentum stalls', type: 'EXIT_RULES' },
              ]
            }
          }
        ]
      }
    }
  });

  console.log('Example Playbooks seeded.');

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