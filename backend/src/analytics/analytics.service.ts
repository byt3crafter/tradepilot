
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BrokerAccountsService } from '../broker-accounts/broker-accounts.service';
import { AssetsService } from '../assets/assets.service';
import { Trade, AssetSpecification } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: BrokerAccountsService,
    private readonly assetsService: AssetsService,
  ) {}

  async getAnalytics(userId: string, accountId: string, startDate?: Date, endDate?: Date) {
    await this.accountsService.findOne(accountId, userId); // Authorization check

    const dateFilter = (startDate || endDate) ? {
      exitDate: {
        gte: startDate,
        lte: endDate ? new Date(endDate.getTime() + 86400000) : undefined, // Include the whole end day
      },
    } : {};

    const trades = await this.prisma.trade.findMany({
      where: {
        userId,
        brokerAccountId: accountId,
        result: { not: null },
        ...dateFilter,
      },
    });
    
    const assetSpecs = await this.assetsService.findAll(userId);
    const assetSpecMap = new Map<string, AssetSpecification>(assetSpecs.map(spec => [spec.symbol, spec]));

    if (trades.length === 0) {
      return {
        largestWinningTrade: 0,
        largestLosingTrade: 0,
        totalPips: 0,
        averagePips: 0,
        averageTradeDurationMinutes: 0,
        performanceByAsset: [],
        performanceByDayOfWeek: [],
        performanceByHourOfDay: [],
      };
    }
    
    // --- Single Value Metrics ---
    let largestWinningTrade = 0;
    let largestLosingTrade = 0;
    let totalPips = 0;
    let totalHoldTimeMs = 0;

    trades.forEach(trade => {
        const pl = trade.profitLoss ?? 0;
        if (pl > largestWinningTrade) largestWinningTrade = pl;
        if (pl < largestLosingTrade) largestLosingTrade = pl;

        if (trade.entryDate && trade.exitDate) {
            totalHoldTimeMs += new Date(trade.exitDate).getTime() - new Date(trade.entryDate).getTime();
        }

        const spec = assetSpecMap.get(trade.asset);
        const pipSize = spec?.pipSize ?? 1;
        if (pipSize > 0 && trade.exitPrice) {
            const pips = trade.direction === 'Buy'
                ? (trade.exitPrice - trade.entryPrice) / pipSize
                : (trade.entryPrice - trade.exitPrice) / pipSize;
            totalPips += pips;
        }
    });

    const averagePips = trades.length > 0 ? totalPips / trades.length : 0;
    const averageTradeDurationMinutes = trades.length > 0 ? (totalHoldTimeMs / trades.length) / 60000 : 0;

    // --- Performance by Asset ---
    const assetPerformanceMap = new Map<string, { totalTrades: number, netPL: number, wins: number, totalPips: number }>();
    trades.forEach(trade => {
        const current = assetPerformanceMap.get(trade.asset) || { totalTrades: 0, netPL: 0, wins: 0, totalPips: 0 };
        current.totalTrades++;
        current.netPL += trade.profitLoss ?? 0;
        if (trade.result === 'Win') current.wins++;
        
        const spec = assetSpecMap.get(trade.asset);
        if (spec?.pipSize && trade.exitPrice) {
             const pips = trade.direction === 'Buy'
                ? (trade.exitPrice - trade.entryPrice) / spec.pipSize
                : (trade.entryPrice - trade.exitPrice) / spec.pipSize;
            current.totalPips += pips;
        }
        
        assetPerformanceMap.set(trade.asset, current);
    });

    const performanceByAsset = Array.from(assetPerformanceMap.entries()).map(([symbol, data]) => ({
      symbol,
      ...data,
      winRate: (data.wins / data.totalTrades) * 100,
    }));

    // --- Performance by Time ---
    const dayOfWeekMap = new Map<number, { netPL: number, totalTrades: number }>();
    const hourOfDayMap = new Map<number, { netPL: number, totalTrades: number }>();

    trades.forEach(trade => {
        if (!trade.entryDate) return;
        const entryDate = new Date(trade.entryDate);
        const day = entryDate.getUTCDay(); // 0 = Sunday
        const hour = entryDate.getUTCHours();
        
        const dayCurrent = dayOfWeekMap.get(day) || { netPL: 0, totalTrades: 0 };
        dayCurrent.netPL += trade.profitLoss ?? 0;
        dayCurrent.totalTrades++;
        dayOfWeekMap.set(day, dayCurrent);
        
        const hourCurrent = hourOfDayMap.get(hour) || { netPL: 0, totalTrades: 0 };
        hourCurrent.netPL += trade.profitLoss ?? 0;
        hourCurrent.totalTrades++;
        hourOfDayMap.set(hour, hourCurrent);
    });
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const performanceByDayOfWeek = dayNames.map((name, i) => ({
      key: name,
      ... (dayOfWeekMap.get(i) || { netPL: 0, totalTrades: 0 })
    }));

    const performanceByHourOfDay = Array.from({ length: 24 }, (_, i) => ({
      key: String(i).padStart(2, '0'),
      ... (hourOfDayMap.get(i) || { netPL: 0, totalTrades: 0 })
    }));


    return {
      largestWinningTrade,
      largestLosingTrade,
      totalPips,
      averagePips,
      averageTradeDurationMinutes,
      performanceByAsset,
      performanceByDayOfWeek,
      performanceByHourOfDay,
    };
  }
}