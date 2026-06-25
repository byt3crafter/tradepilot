import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrokerAccountDto } from './dtos/create-broker-account.dto';
import { UpdateBrokerAccountDto } from './dtos/update-broker-account.dto';
import { Trade } from '@prisma/client';
import { DrawdownService } from './drawdown.service';

@Injectable()
export class BrokerAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drawdownService: DrawdownService,
  ) { }

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

    // Now calculate status and consistency
    const drawdownStats = await this.drawdownService.calculateDrawdown(accountId, userId);

    await this.prisma.brokerAccount.update({
      where: { id: accountId },
      data: {
        status: drawdownStats.status,
        consistencyScore: drawdownStats.consistencyScore
      },
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
    const initialBalance = account.initialBalance;

    // --- Calculations for Overall Metrics (in one pass) ---
    let highWaterMark = initialBalance;
    let cumulativePL = 0;
    const uniqueTradingDaysSet = new Set<string>();

    for (const trade of trades) {
      const tradeNetPL = trade.profitLoss ?? 0;
      cumulativePL += tradeNetPL;
      const currentEquity = initialBalance + cumulativePL;

      if (currentEquity > highWaterMark) {
        highWaterMark = currentEquity;
      }

      if (trade.entryDate) {
        uniqueTradingDaysSet.add(new Date(trade.entryDate).toDateString());
      }
    }

    // FIX: Max loss is now calculated as High-Water Mark - Current Balance
    const maxDrawdownSoFar = Math.max(0, highWaterMark - account.currentBalance);

    const totalNetPL = cumulativePL;
    const uniqueTradingDays = uniqueTradingDaysSet.size;

    // --- Calculation for Daily Loss (TODAY, not last trading day) ---
    let currentDailyLoss = 0;
    if (maxDailyLoss && trades.length > 0) {
      const today = new Date();
      const startOfToday = new Date(today);
      startOfToday.setUTCHours(0, 0, 0, 0);
      const endOfToday = new Date(today);
      endOfToday.setUTCHours(23, 59, 59, 999);

      const tradesToday = trades.filter(t => {
        const exitDate = new Date(t.exitDate!);
        return exitDate >= startOfToday && exitDate <= endOfToday;
      });

      const netPLToday = tradesToday.reduce((sum, trade) => sum + (trade.profitLoss ?? 0), 0);

      // FIX: Daily loss is $0 if the day was profitable, otherwise it's the net loss.
      if (netPLToday < 0) {
        currentDailyLoss = Math.abs(netPLToday);
      } else {
        currentDailyLoss = 0;
      }
    }


    // --- Objective 1: Profit Target ---
    if (profitTarget) {
      const remaining = profitTarget - totalNetPL;
      results.push({
        key: 'profitTarget',
        title: `Profit Target`,
        currentValue: totalNetPL,
        targetValue: profitTarget,
        remaining: remaining > 0 ? remaining : 0,
        status: totalNetPL >= profitTarget ? 'Success' : 'In Progress',
        type: 'progress',
        format: 'currency',
      });
    }

    // --- Objective 2: Minimum Trading Days ---
    if (minTradingDays) {
      results.push({
        key: 'minTradingDays',
        title: `Minimum days`,
        currentValue: uniqueTradingDays,
        targetValue: minTradingDays,
        status: uniqueTradingDays >= minTradingDays ? 'Success' : 'In Progress',
        type: 'simple',
        format: 'days',
      });
    }

    // --- Objective 3: Max Loss (Trailing Drawdown) ---
    if (maxLoss) {
      results.push({
        key: 'maxLoss',
        title: `Max Loss`,
        currentValue: maxDrawdownSoFar,
        targetValue: maxLoss,
        status: maxDrawdownSoFar >= maxLoss ? 'Failed' : 'In Progress',
        type: 'simple',
        format: 'currency',
      });
    }

    // --- Objective 4: Max Daily Loss ---
    if (maxDailyLoss) {
      results.push({
        key: 'maxDailyLoss',
        title: `Max Daily Loss`,
        currentValue: currentDailyLoss,
        targetValue: maxDailyLoss,
        status: currentDailyLoss >= maxDailyLoss ? 'Failed' : 'In Progress',
        type: 'progress',
        format: 'currency',
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
