import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlaybookDto } from './dtos/create-playbook.dto';
import { UpdatePlaybookDto } from './dtos/update-playbook.dto';
import { ChecklistItemType, Trade } from '@prisma/client';

@Injectable()
export class PlaybooksService {
  constructor(private readonly prisma: PrismaService) { }

  // Helper function to transform the Prisma result to match the frontend's expected structure.
  private transformPlaybook(playbook: any) {
    if (!playbook) return null;

    const transformedSetups = playbook.setups.map((setup: any) => {
      const entryCriteria = setup.checklistItems.filter((item: any) => item.type === 'ENTRY_CRITERIA');
      const riskManagement = setup.checklistItems.filter((item: any) => item.type === 'RISK_MANAGEMENT');
      const exitRules = setup.checklistItems.filter((item: any) => item.type === 'EXIT_RULES');
      const confirmationFilters = setup.checklistItems.filter((item: any) => item.type === 'CONFIRMATION_FILTERS');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { checklistItems, ...restOfSetup } = setup;
      return { ...restOfSetup, entryCriteria, riskManagement, exitRules, confirmationFilters };
    });

    return { ...playbook, setups: transformedSetups };
  }

  async create(userId: string, createDto: CreatePlaybookDto) {
    const { setups, ...playbookData } = createDto;

    return this.prisma.playbook.create({
      data: {
        ...playbookData,
        userId,
        setups: {
          create: setups?.map(setup => {
            const entryCriteriaItems = setup.entryCriteria?.map(item => ({
              text: item.text,
              type: ChecklistItemType.ENTRY_CRITERIA,
            })) || [];

            const riskManagementItems = setup.riskManagement?.map(item => ({
              text: item.text,
              type: ChecklistItemType.RISK_MANAGEMENT,
            })) || [];

            const exitRulesItems = setup.exitRules?.map(item => ({
              text: item.text,
              type: ChecklistItemType.EXIT_RULES,
            })) || [];

            const confirmationFiltersItems = setup.confirmationFilters?.map(item => ({
              text: item.text,
              type: ChecklistItemType.CONFIRMATION_FILTERS,
            })) || [];

            return {
              name: setup.name,
              screenshotBeforeUrl: setup.screenshotBeforeUrl,
              screenshotAfterUrl: setup.screenshotAfterUrl,
              riskSettings: setup.riskSettings,
              checklistItems: {
                create: [...entryCriteriaItems, ...riskManagementItems, ...exitRulesItems, ...confirmationFiltersItems],
              },
            };
          }) || [],
        },
      },
    });
  }

  async findAll(userId: string) {
    const playbooks = await this.prisma.playbook.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        setups: {
          include: {
            checklistItems: true,
          },
        },
      },
    });
    return playbooks.map((p: any) => this.transformPlaybook(p));
  }

  async findAllPublic(currentUserId: string) {
    const publicPlaybooks = await this.prisma.playbook.findMany({
      where: {
        isPublic: true,
      },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
        setups: {
          include: {
            checklistItems: true,
          },
        },
        trades: { // Include trades to calculate stats
          where: {
            result: { not: null }
          },
          select: {
            result: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return publicPlaybooks.map((playbook) => {
      const transformed = this.transformPlaybook(playbook);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { userId, trades, ...rest } = transformed;

      // Calculate basic stats
      const totalTrades = playbook.trades.length;
      const winningTrades = playbook.trades.filter(t => t.result === 'Win').length;
      const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;

      return {
        ...rest,
        authorName: playbook.user.fullName,
        authorId: playbook.userId, // Include authorId for frontend checks
        winRate,
        tradeCount: totalTrades,
      };
    });
  }

  async findOne(id: string, userId: string, transform = true) {
    const playbook = await this.prisma.playbook.findUnique({
      where: { id },
      include: {
        setups: {
          include: {
            checklistItems: true,
          },
        },
      },
    });

    if (!playbook) {
      throw new NotFoundException(`Playbook with ID ${id} not found.`);
    }
    if (playbook.userId !== userId && !playbook.isPublic) {
      throw new ForbiddenException('You are not authorized to access this playbook.');
    }
    return transform ? this.transformPlaybook(playbook) : playbook;
  }

  async update(id: string, userId: string, updateDto: UpdatePlaybookDto) {
    await this.findOne(id, userId, false); // Authorization check without transformation
    const { setups, ...playbookData } = updateDto;

    const updatedPlaybook = await this.prisma.playbook.update({
      where: { id },
      data: {
        ...playbookData,
        setups: {
          deleteMany: {},
          create: setups?.map(setup => {
            const entryCriteriaItems = setup.entryCriteria?.map(item => ({
              text: item.text,
              type: ChecklistItemType.ENTRY_CRITERIA,
            })) || [];

            const riskManagementItems = setup.riskManagement?.map(item => ({
              text: item.text,
              type: ChecklistItemType.RISK_MANAGEMENT,
            })) || [];

            const exitRulesItems = setup.exitRules?.map(item => ({
              text: item.text,
              type: ChecklistItemType.EXIT_RULES,
            })) || [];

            const confirmationFiltersItems = setup.confirmationFilters?.map(item => ({
              text: item.text,
              type: ChecklistItemType.CONFIRMATION_FILTERS,
            })) || [];

            return {
              name: setup.name,
              screenshotBeforeUrl: setup.screenshotBeforeUrl,
              screenshotAfterUrl: setup.screenshotAfterUrl,
              riskSettings: setup.riskSettings,
              checklistItems: {
                create: [...entryCriteriaItems, ...riskManagementItems, ...exitRulesItems, ...confirmationFiltersItems],
              },
            };
          }) || [],
        },
      },
      include: {
        setups: {
          include: {
            checklistItems: true,
          },
        },
      },
    });
    return this.transformPlaybook(updatedPlaybook);
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId, false); // Authorization check
    await this.prisma.playbook.delete({ where: { id } });
    return { message: 'Playbook deleted successfully.' };
  }

  async getPlaybookStats(id: string, userId: string) {
    await this.findOne(id, userId, false); // Authorization check

    const closedTrades = await this.prisma.trade.findMany({
      where: {
        playbookId: id,
        userId,
        result: { not: null },
      },
      orderBy: { exitDate: 'asc' },
    });

    if (closedTrades.length === 0) {
      return {
        netPL: 0,
        totalTrades: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        expectancy: 0,
        riskRewardRatio: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        largestDailyLoss: 0,
        recoveryFactor: 0,
        tradesPerDay: 0,
        maxConsecutiveProfitableDays: 0,
        currentStreak: 0,
        avgHoldTimeHours: 0,
        equityCurve: [],
      };
    }

    const winningTrades = closedTrades.filter((t: Trade) => t.result === 'Win');
    const losingTrades = closedTrades.filter((t: Trade) => t.result === 'Loss');

    const grossProfit = winningTrades.reduce((sum: number, trade: Trade) => sum + (trade.profitLoss ?? 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum: number, trade: Trade) => sum + (trade.profitLoss ?? 0), 0));

    const totalCommission = closedTrades.reduce((sum: number, trade: Trade) => sum + (trade.commission ?? 0), 0);
    const totalSwap = closedTrades.reduce((sum: number, trade: Trade) => sum + (trade.swap ?? 0), 0);

    const netPL = grossProfit - grossLoss - totalCommission - totalSwap;

    const tradesForRate = winningTrades.length + losingTrades.length;
    const winRate = tradesForRate > 0 ? (winningTrades.length / tradesForRate) * 100 : 0;

    const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;

    const expectancy = (winRate / 100 * avgWin) - ((1 - (winRate / 100)) * avgLoss);

    // Risk/Reward Ratio
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Equity Curve, Drawdown, Daily Loss tracking
    let runningBalance = 0;
    let maxEquity = 0;
    let maxDrawdown = 0;
    let largestDailyLoss = 0;

    const equityCurve = closedTrades.map((trade: Trade) => {
      const tradeNetPL = trade.profitLoss ?? 0;
      runningBalance += tradeNetPL;

      // Track max equity for drawdown calculation
      if (runningBalance > maxEquity) {
        maxEquity = runningBalance;
      }

      // Calculate drawdown from peak
      const currentDrawdown = Math.max(0, maxEquity - runningBalance);
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
      }

      return {
        date: trade.exitDate!.toISOString().split('T')[0],
        cumulativePL: runningBalance,
      };
    });

    // Largest Daily Loss & Unique Trading Days
    const tradesByDay = new Map<string, number>();
    closedTrades.forEach(t => {
      const day = new Date(t.exitDate!).toLocaleDateString();
      const current = tradesByDay.get(day) || 0;
      tradesByDay.set(day, current + (t.profitLoss ?? 0));
    });

    const uniqueTradingDays = tradesByDay.size;

    tradesByDay.forEach(dailyPL => {
      if (dailyPL < 0) {
        largestDailyLoss = Math.max(largestDailyLoss, Math.abs(dailyPL));
      }
    });

    // Max Drawdown Percentage
    const maxDrawdownPercent = maxEquity > 0 ? (maxDrawdown / maxEquity) * 100 : 0;

    // Recovery Factor
    const recoveryFactor = maxDrawdown > 0 ? netPL / maxDrawdown : (netPL > 0 ? Infinity : 0);

    // Trades Per Day
    const tradesPerDay = uniqueTradingDays > 0 ? (closedTrades.length / uniqueTradingDays).toFixed(2) : '0';

    // Consecutive Days Profitable
    let maxConsecutiveProfitableDays = 0;
    let currentConsecutiveDays = 0;
    const dailyResults = Array.from(tradesByDay.entries()).sort();
    dailyResults.forEach(([, dailyPL]) => {
      if (dailyPL > 0) {
        currentConsecutiveDays++;
        maxConsecutiveProfitableDays = Math.max(maxConsecutiveProfitableDays, currentConsecutiveDays);
      } else {
        currentConsecutiveDays = 0;
      }
    });

    // Current Streak (Win/Loss streak from most recent trades)
    let currentStreak = 0;
    for (let i = closedTrades.length - 1; i >= 0; i--) {
      const t = closedTrades[i];
      if (t.result === 'Win') {
        if (currentStreak >= 0) currentStreak++;
        else break;
      } else if (t.result === 'Loss') {
        if (currentStreak <= 0) currentStreak--;
        else break;
      } else {
        break;
      }
    }

    const totalHoldTimeMs = closedTrades.reduce((sum: number, trade: Trade) => {
      if (trade.entryDate && trade.exitDate) {
        return sum + (new Date(trade.exitDate).getTime() - new Date(trade.entryDate).getTime());
      }
      return sum;
    }, 0);
    const avgHoldTimeHours = closedTrades.length > 0 ? (totalHoldTimeMs / closedTrades.length) / (1000 * 60 * 60) : 0;

    // --- Per-Setup Stats ---
    const playbook = await this.findOne(id, userId, true);
    const setupStats = playbook.setups.map((setup: any) => {
      const setupTrades = closedTrades.filter(t => t.playbookSetupId === setup.id);
    });

    // Add "Unassigned" category for existing trades or general trades
    const unassignedTrades = closedTrades.filter(t => !t.playbookSetupId);
    if (unassignedTrades.length > 0) {
      const total = unassignedTrades.length;
      const wins = unassignedTrades.filter(t => t.result === 'Win').length;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
      const netPL = unassignedTrades.reduce((sum, t) => sum + (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0), 0);

      setupStats.push({
        setupId: 'unassigned',
        setupName: 'Unassigned / General',
        winRate,
        totalTrades: total,
        netPL
      });
    }

    return {
      netPL,
      totalTrades: closedTrades.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      expectancy,
      riskRewardRatio,
      maxDrawdown,
      maxDrawdownPercent,
      largestDailyLoss,
      recoveryFactor,
      tradesPerDay: parseFloat(tradesPerDay as string),
      maxConsecutiveProfitableDays,
      currentStreak,
      avgHoldTimeHours,
      equityCurve,
      setups: setupStats,
    };
  }
}