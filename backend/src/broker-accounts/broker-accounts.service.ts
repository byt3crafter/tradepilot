
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrokerAccountDto } from './dtos/create-broker-account.dto';
import { UpdateBrokerAccountDto } from './dtos/update-broker-account.dto';
// FIX: The import from '@prisma/client' fails when `prisma generate` has not been run.
// import { Trade } from '@prisma/client';

// FIX: Define local types to satisfy TypeScript during compile time.
type Trade = any;

@Injectable()
export class BrokerAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createBrokerAccountDto: CreateBrokerAccountDto) {
    const { objectives, smartLimits, ...accountData } = createBrokerAccountDto;
    return this.prisma.brokerAccount.create({
      data: {
        ...accountData,
        initialBalance: accountData.initialBalance,
        currentBalance: accountData.initialBalance,
        userId,
        objectives: objectives ? {
          create: {
            ...objectives,
            isEnabled: true,
          }
        } : undefined,
        smartLimits: smartLimits ? {
            create: {
                ...smartLimits,
                isEnabled: true,
            }
        } : undefined,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.brokerAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        objectives: true,
        smartLimits: true,
      },
    });
  }

  async findOne(id: string, userId: string) {
    const account = await this.prisma.brokerAccount.findUnique({
      where: { id },
      include: {
        objectives: true,
        smartLimits: true,
      }
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found.`);
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('You are not authorized to access this account.');
    }

    return account;
  }

  async update(id: string, userId: string, updateBrokerAccountDto: UpdateBrokerAccountDto) {
    await this.findOne(id, userId); // Authorization check
    const { objectives, smartLimits, ...accountData } = updateBrokerAccountDto;

    return this.prisma.brokerAccount.update({
      where: { id },
      data: {
        ...accountData,
        objectives: {
          upsert: {
            create: { ...objectives, isEnabled: objectives?.isEnabled },
            update: { ...objectives },
          }
        },
        smartLimits: {
          upsert: {
            create: { ...smartLimits, isEnabled: smartLimits?.isEnabled },
            update: { ...smartLimits },
          }
        }
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Authorization check
    
    await this.prisma.brokerAccount.delete({
      where: { id },
    });
    
    return { message: 'Account deleted successfully.' };
  }

  async getObjectivesProgress(id: string, userId: string) {
    const account = await this.findOne(id, userId);
    if (!account.objectives || !account.objectives.isEnabled) {
      return [];
    }

    const trades = await this.prisma.trade.findMany({
      where: { brokerAccountId: id, result: { not: null } },
      orderBy: { entryDate: 'asc' },
    });
    
    const results = [];
    const { profitTarget, minTradingDays, maxLoss, maxDailyLoss } = account.objectives;

    // --- Calculations ---
    const totalNetPL = trades.reduce((sum: number, trade: Trade) => sum + (trade.profitLoss ?? 0) - (trade.commission ?? 0) - (trade.swap ?? 0), 0);
    const uniqueTradingDays = new Set(trades.map((t: Trade) => new Date(t.entryDate).toDateString())).size;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dailyTrades = trades.filter((t: Trade) => new Date(t.entryDate) >= today);
    const dailyNetPL = dailyTrades.reduce((sum: number, trade: Trade) => sum + (trade.profitLoss ?? 0) - (trade.commission ?? 0) - (trade.swap ?? 0), 0);

    // --- Objective 1: Profit Target ---
    if (profitTarget) {
      const remaining = profitTarget - totalNetPL;
      results.push({
        key: 'profitTarget',
        title: `Profit Target $${profitTarget.toLocaleString()}`,
        currentValue: totalNetPL,
        targetValue: profitTarget,
        remaining: remaining > 0 ? remaining : 0,
        status: totalNetPL >= profitTarget ? 'Success' : 'In Progress',
        type: 'progress'
      });
    }

    // --- Objective 2: Minimum Trading Days ---
    if (minTradingDays) {
      results.push({
        key: 'minTradingDays',
        title: `Minimum days - ${minTradingDays}`,
        currentValue: uniqueTradingDays,
        targetValue: minTradingDays,
        status: uniqueTradingDays >= minTradingDays ? 'Success' : 'In Progress',
        type: 'simple'
      });
    }

    // --- Objective 3: Max Loss ---
    if (maxLoss) {
      const currentLoss = totalNetPL < 0 ? Math.abs(totalNetPL) : 0;
      results.push({
        key: 'maxLoss',
        title: `Max Loss $${maxLoss.toLocaleString()}`,
        currentValue: currentLoss,
        targetValue: maxLoss,
        status: currentLoss > maxLoss ? 'Failed' : 'In Progress',
        type: 'simple'
      });
    }

    // --- Objective 4: Max Daily Loss ---
    if (maxDailyLoss) {
      const currentDailyLoss = dailyNetPL < 0 ? Math.abs(dailyNetPL) : 0;
      results.push({
        key: 'maxDailyLoss',
        title: `Max Daily Loss $${maxDailyLoss.toLocaleString()}`,
        currentValue: currentDailyLoss,
        targetValue: maxDailyLoss,
        remaining: maxDailyLoss - currentDailyLoss,
        status: currentDailyLoss > maxDailyLoss ? 'Failed' : 'In Progress',
        type: 'progress'
      });
    }

    return results;
  }

  async getSmartLimitsProgress(id: string, userId: string) {
    const account = await this.findOne(id, userId);
    if (!account.smartLimits || !account.smartLimits.isEnabled) {
      return { isTradeCreationBlocked: false, blockReason: null, tradesToday: 0, lossesToday: 0 };
    }

    const { maxTradesPerDay, maxLossesPerDay } = account.smartLimits;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);

    const dailyTrades = await this.prisma.trade.findMany({
      where: { 
        brokerAccountId: id, 
        userId,
        entryDate: {
            gte: today,
            lt: tomorrow,
        }
      },
    });
    
    const tradesToday = dailyTrades.length;
    const lossesToday = dailyTrades.filter((t: Trade) => t.result === 'Loss').length;
    
    let isTradeCreationBlocked = false;
    let blockReason: string | null = null;
    
    if (maxTradesPerDay && tradesToday >= maxTradesPerDay) {
        isTradeCreationBlocked = true;
        blockReason = `Daily trade limit of ${maxTradesPerDay} reached.`;
    } else if (maxLossesPerDay && lossesToday >= maxLossesPerDay) {
        isTradeCreationBlocked = true;
        blockReason = `Daily loss limit of ${maxLossesPerDay} reached.`;
    }

    return {
        tradesToday,
        lossesToday,
        maxTradesPerDay,
        maxLossesPerDay,
        isTradeCreationBlocked,
        blockReason,
    };
  }
}