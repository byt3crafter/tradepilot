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
      id: 'user_seed_1', // Provide a fixed ID for the seeded user
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
          },
          {
            name: 'Trend Continuation',
            riskSettings: { riskPercent: 1.0, stopLossType: 'Below Structure' },
            checklistItems: {
              create: [
                { text: 'Market structure is bullish (HH/HL)', type: 'ENTRY_CRITERIA' },
                { text: 'Price consolidates in a flag pattern', type: 'ENTRY_CRITERIA' },
                { text: 'Breakout of the flag', type: 'ENTRY_CRITERIA' },
                { text: 'No divergence on MACD', type: 'CONFIRMATION_FILTERS' },
                { text: 'Stop loss below the flag low', type: 'RISK_MANAGEMENT' },
                { text: 'Target measured move of the pole', type: 'RISK_MANAGEMENT' },
                { text: 'Exit on first sign of reversal', type: 'EXIT_RULES' },
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
          },
          {
            name: 'Head & Shoulders',
            riskSettings: { riskPercent: 1.5, stopLossType: 'Above Right Shoulder' },
            checklistItems: {
              create: [
                { text: 'Left Shoulder, Head, Right Shoulder formed', type: 'ENTRY_CRITERIA' },
                { text: 'Break of the neckline', type: 'ENTRY_CRITERIA' },
                { text: 'Volume declines on the right shoulder', type: 'CONFIRMATION_FILTERS' },
                { text: 'Stop loss above the right shoulder', type: 'RISK_MANAGEMENT' },
                { text: 'Target distance from head to neckline', type: 'RISK_MANAGEMENT' },
                { text: 'Exit if price reclaims neckline', type: 'EXIT_RULES' },
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
          },
          {
            name: '5-Minute Breakout',
            riskSettings: { riskPercent: 0.5, stopLossType: 'Below Candle' },
            checklistItems: {
              create: [
                { text: 'Price consolidates for > 20 mins', type: 'ENTRY_CRITERIA' },
                { text: 'Breakout of consolidation box', type: 'ENTRY_CRITERIA' },
                { text: 'Volume spike', type: 'CONFIRMATION_FILTERS' },
                { text: 'Stop loss below breakout candle', type: 'RISK_MANAGEMENT' },
                { text: 'Target 1:2 Risk/Reward', type: 'RISK_MANAGEMENT' },
                { text: 'Exit if price falls back into box', type: 'EXIT_RULES' },
              ]
            }
          }
        ]
      }
    }
  });

  // Playbook 4: The Complete Strategist (Showcase)
  await prisma.playbook.create({
    data: {
      name: 'The Complete Strategist',
      coreIdea: 'A multi-faceted approach combining trend, reversal, and ranging strategies.',
      userId: user1.id,
      tradingStyles: ['Swing', 'Position'],
      instruments: ['EURUSD', 'XAUUSD', 'US30'],
      timeframes: ['4h', 'Daily', 'Weekly'],
      pros: ['Adaptable to any market condition', 'Diversified risk'],
      cons: ['Complex to manage', 'Requires broad knowledge'],
      isPublic: true,
      setups: {
        create: [
          {
            name: 'Trend: Moving Average Crossover',
            riskSettings: { riskPercent: 1.0, stopLossType: 'ATR Based' },
            checklistItems: {
              create: [
                { text: 'Fast MA crosses above Slow MA', type: 'ENTRY_CRITERIA' },
                { text: 'Price is above 200 EMA', type: 'ENTRY_CRITERIA' },
                { text: 'ADX > 25 (Strong Trend)', type: 'CONFIRMATION_FILTERS' },
                { text: 'Stop Loss 2x ATR', type: 'RISK_MANAGEMENT' },
                { text: 'Target 4x ATR', type: 'RISK_MANAGEMENT' },
                { text: 'Exit on reverse crossover', type: 'EXIT_RULES' },
              ]
            }
          },
          {
            name: 'Reversal: Divergence',
            riskSettings: { riskPercent: 1.5, stopLossType: 'Swing High/Low' },
            checklistItems: {
              create: [
                { text: 'Price makes Lower Low', type: 'ENTRY_CRITERIA' },
                { text: 'RSI makes Higher Low', type: 'ENTRY_CRITERIA' },
                { text: 'Bullish candle confirmation', type: 'ENTRY_CRITERIA' },
                { text: 'Support zone confluence', type: 'CONFIRMATION_FILTERS' },
                { text: 'Stop Loss below Swing Low', type: 'RISK_MANAGEMENT' },
                { text: 'Target recent Swing High', type: 'RISK_MANAGEMENT' },
                { text: 'Exit if RSI breaks trendline', type: 'EXIT_RULES' },
              ]
            }
          },
          {
            name: 'Range: Support Bounce',
            riskSettings: { riskPercent: 1.0, stopLossType: 'Fixed Pips' },
            checklistItems: {
              create: [
                { text: 'Market is in a defined range', type: 'ENTRY_CRITERIA' },
                { text: 'Price touches Support', type: 'ENTRY_CRITERIA' },
                { text: 'Rejection wick forms', type: 'ENTRY_CRITERIA' },
                { text: 'Stochastic oversold', type: 'CONFIRMATION_FILTERS' },
                { text: 'Stop Loss below Support zone', type: 'RISK_MANAGEMENT' },
                { text: 'Target Resistance zone', type: 'RISK_MANAGEMENT' },
                { text: 'Exit if price breaks Support', type: 'EXIT_RULES' },
              ]
            }
          }
        ]
      }
    }
  });

  console.log('Example Playbooks seeded.');

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