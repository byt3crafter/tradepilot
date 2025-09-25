import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrokerAccountDto } from './dtos/create-broker-account.dto';
import { UpdateBrokerAccountDto } from './dtos/update-broker-account.dto';
import { Trade } from '@prisma/client';

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

  public async recalculateBalance(accountId: string, userId: string): Promise<void> {
    const account = await this.findOne(accountId, userId); // Ensures ownership and gets initialBalance

    const trades = await this.prisma.trade.findMany({
      where: {
        brokerAccountId: accountId,
        result: { not: null }, // Only closed trades
      },
    });

    // Summing only the net profit/loss of each trade
    const totalNetPL = trades.reduce((sum, trade) => sum + (trade.profitLoss ?? 0), 0);
    
    const newCurrentBalance = account.initialBalance + totalNetPL;

    await this.prisma.brokerAccount.update({
      where: { id: accountId },
      data: { currentBalance: newCurrentBalance },
    });
  }

  async getObjectivesProgress(id: string, userId: string) {
    const account = await this.findOne(id, userId);
    if (!account.objectives || !account.objectives.isEnabled) {
      return [];
    }

    const trades = await this.prisma.trade.findMany({
      where: { brokerAccountId: id, result: { not: null } },
      orderBy: { exitDate: 'asc' }, // Order by exit date to calculate equity curve correctly
    });
    
    const results = [];
    const { profitTarget, minTradingDays, maxLoss, maxDailyLoss } = account.objectives;

    // --- Calculations in one pass for efficiency ---
    const initialBalance = account.initialBalance;
    let highWaterMark = initialBalance;
    let cumulativePL = 0;
    const uniqueTradingDaysSet = new Set<string>();
    
    // Define today's range in UTC to avoid timezone issues
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);

    let dailyLossSum = 0;

    for (const trade of trades) {
        // P/L and Drawdown: Use net profitLoss directly
        const tradeNetPL = trade.profitLoss ?? 0;
        cumulativePL += tradeNetPL;
        const currentEquity = initialBalance + cumulativePL;
        if (currentEquity > highWaterMark) {
            highWaterMark = currentEquity;
        }

        // Trading Days: A day with a trade entry counts
        if (trade.entryDate) {
            uniqueTradingDaysSet.add(new Date(trade.entryDate).toDateString());
        }

        // Daily Loss: Sum P/L for trades closed today (UTC)
        if (trade.exitDate) {
            const exitDate = new Date(trade.exitDate);
            if (exitDate >= today && exitDate < tomorrow) {
                if(tradeNetPL < 0) {
                    dailyLossSum += tradeNetPL;
                }
            }
        }
    }

    const totalNetPL = cumulativePL;
    const currentBalance = initialBalance + totalNetPL;
    const currentDrawdown = Math.max(0, highWaterMark - currentBalance);
    const uniqueTradingDays = uniqueTradingDaysSet.size;
    const currentDailyLoss = Math.abs(dailyLossSum);


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

    // --- Objective 3: Max Loss (Trailing Drawdown) ---
    if (maxLoss) {
      const remaining = maxLoss - currentDrawdown;
      results.push({
        key: 'maxLoss',
        title: `Max Loss $${maxLoss.toLocaleString()}`,
        currentValue: currentDrawdown,
        targetValue: maxLoss,
        remaining: remaining > 0 ? remaining : 0,
        status: currentDrawdown >= maxLoss ? 'Failed' : 'In Progress',
        type: 'simple'
      });
    }

    // --- Objective 4: Max Daily Loss ---
    if (maxDailyLoss) {
      const remaining = maxDailyLoss - currentDailyLoss;
      results.push({
        key: 'maxDailyLoss',
        title: `Max Daily Loss $${maxDailyLoss.toLocaleString()}`,
        currentValue: currentDailyLoss,
        targetValue: maxDailyLoss,
        remaining: remaining > 0 ? remaining : 0,
        status: currentDailyLoss >= maxDailyLoss ? 'Failed' : 'In Progress',
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