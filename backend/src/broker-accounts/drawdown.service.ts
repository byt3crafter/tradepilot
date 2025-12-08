import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BrokerAccount, Trade, DrawdownType } from '@prisma/client';

export interface DrawdownCalculation {
  // Account Info
  accountId: string;
  accountName: string;
  initialBalance: number;
  currentBalance: number;

  // Template Info (if applicable)
  templateName?: string | null;
  firmName?: string | null;

  // Profit/Loss
  totalProfitLoss: number;
  profitLossPercentage: number;

  // Profit Target
  profitTarget?: number | null;
  profitTargetProgress?: number | null; // percentage (0-100)
  profitTargetRemaining?: number | null;

  // Drawdown
  maxDrawdownLimit?: number | null;
  dailyDrawdownLimit?: number | null;
  currentMaxDrawdown: number; // actual current max dd
  currentDailyDrawdown: number; // actual current daily dd
  maxDrawdownPercentage?: number | null; // % of limit used
  dailyDrawdownPercentage?: number | null; // % of limit used

  // Trading Days
  minTradingDays?: number | null;
  daysTradedCount: number;
  daysTradedProgress?: number | null; // percentage (0-100)

  // Compliance
  isCompliant: boolean;
  violations: string[];

  // Drawdown Type
  drawdownType?: DrawdownType | null;
}

@Injectable()
export class DrawdownService {
  constructor(private readonly prisma: PrismaService) { }

  async calculateDrawdown(accountId: string, userId: string): Promise<DrawdownCalculation> {
    // Fetch account with template and trades
    const account = await this.prisma.brokerAccount.findFirst({
      where: { id: accountId, userId },
      include: {
        template: true,
        objectives: true,
        trades: {
          where: { exitDate: { not: null } },
          orderBy: { exitDate: 'asc' },
        },
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const initialBalance = account.initialBalance;
    const currentBalance = account.currentBalance;
    const totalProfitLoss = currentBalance - initialBalance;
    const profitLossPercentage = initialBalance > 0 ? (totalProfitLoss / initialBalance) * 100 : 0;

    // Get objectives from template or account
    const profitTarget = account.objectives?.profitTarget ?? account.template?.profitTarget ?? null;
    const maxDrawdownLimit = account.objectives?.maxLoss ?? account.template?.maxDrawdown ?? null;
    const dailyDrawdownLimit = account.objectives?.maxDailyLoss ?? account.template?.dailyDrawdown ?? null;
    const minTradingDays = account.objectives?.minTradingDays ?? account.template?.minTradingDays ?? null;
    const drawdownType = account.template?.drawdownType ?? null;

    // Calculate profit target progress
    let profitTargetProgress: number | null = null;
    let profitTargetRemaining: number | null = null;
    if (profitTarget) {
      profitTargetProgress = Math.min((totalProfitLoss / profitTarget) * 100, 100);
      profitTargetRemaining = Math.max(profitTarget - totalProfitLoss, 0);
    }

    // Calculate max drawdown (static or trailing)
    const currentMaxDrawdown = this.calculateMaxDrawdown(
      account.trades,
      initialBalance,
      drawdownType || 'STATIC',
    );

    // Calculate daily drawdown (today only)
    const currentDailyDrawdown = this.calculateDailyDrawdown(account.trades);

    // Calculate drawdown percentages
    let maxDrawdownPercentage: number | null = null;
    let dailyDrawdownPercentage: number | null = null;
    if (maxDrawdownLimit) {
      maxDrawdownPercentage = Math.min((Math.abs(currentMaxDrawdown) / maxDrawdownLimit) * 100, 100);
    }
    if (dailyDrawdownLimit) {
      dailyDrawdownPercentage = Math.min((Math.abs(currentDailyDrawdown) / dailyDrawdownLimit) * 100, 100);
    }

    // Calculate days traded
    const daysTradedCount = this.calculateDaysTraded(account.trades);
    let daysTradedProgress: number | null = null;
    if (minTradingDays) {
      daysTradedProgress = Math.min((daysTradedCount / minTradingDays) * 100, 100);
    }

    // Check compliance
    const violations: string[] = [];
    if (maxDrawdownLimit && Math.abs(currentMaxDrawdown) > maxDrawdownLimit) {
      violations.push(`Max drawdown exceeded: $${Math.abs(currentMaxDrawdown).toFixed(2)} > $${maxDrawdownLimit}`);
    }
    if (dailyDrawdownLimit && Math.abs(currentDailyDrawdown) > dailyDrawdownLimit) {
      violations.push(`Daily drawdown exceeded: $${Math.abs(currentDailyDrawdown).toFixed(2)} > $${dailyDrawdownLimit}`);
    }
    const isCompliant = violations.length === 0;

    return {
      accountId: account.id,
      accountName: account.name,
      initialBalance,
      currentBalance,
      templateName: account.template?.name ?? null,
      firmName: account.template?.firmName ?? null,
      totalProfitLoss,
      profitLossPercentage,
      profitTarget,
      profitTargetProgress,
      profitTargetRemaining,
      maxDrawdownLimit,
      dailyDrawdownLimit,
      currentMaxDrawdown,
      currentDailyDrawdown,
      maxDrawdownPercentage,
      dailyDrawdownPercentage,
      minTradingDays,
      daysTradedCount,
      daysTradedProgress,
      isCompliant,
      violations,
      drawdownType,
    };
  }

  private calculateMaxDrawdown(trades: Trade[], initialBalance: number, drawdownType: DrawdownType): number {
    if (trades.length === 0) return 0;

    let balance = initialBalance;
    let peak = initialBalance;
    let maxDrawdown = 0;

    for (const trade of trades) {
      const pl = trade.profitLoss ?? 0;
      balance += pl;

      if (drawdownType === 'TRAILING') {
        // Trailing: peak moves up with profits
        if (balance > peak) {
          peak = balance;
        }
      }
      // Static: peak stays at initial balance

      const drawdown = balance - (drawdownType === 'TRAILING' ? peak : initialBalance);
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  private calculateDailyDrawdown(trades: Trade[]): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTrades = trades.filter((trade) => {
      const exitDate = trade.exitDate ? new Date(trade.exitDate) : null;
      if (!exitDate) return false;
      exitDate.setHours(0, 0, 0, 0);
      return exitDate.getTime() === today.getTime();
    });

    return todayTrades.reduce((sum, trade) => sum + (trade.profitLoss ?? 0), 0);
  }

  private calculateDaysTraded(trades: Trade[]): number {
    const uniqueDays = new Set<string>();
    for (const trade of trades) {
      if (trade.exitDate) {
        const date = new Date(trade.exitDate);
        const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        uniqueDays.add(dayKey);
      }
    }
    return uniqueDays.size;
  }
}
