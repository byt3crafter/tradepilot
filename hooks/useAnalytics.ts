
import { useMemo } from 'react';
import { Trade, TradeResult } from '../types';

export const useAnalytics = (trades: Trade[]) => {
  const stats = useMemo(() => {
    // Sort trades by date ascending for curve calculation
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime()
    );

    const closedTrades = sortedTrades.filter(t => t.result);
    const totalTrades = closedTrades.length;

    const winningTrades = closedTrades.filter(t => t.result === TradeResult.Win);
    const losingTrades = closedTrades.filter(t => t.result === TradeResult.Loss);
    const breakevenTrades = closedTrades.filter(t => t.result === TradeResult.Breakeven);

    const grossProfit = winningTrades.reduce((sum, trade) => sum + (trade.profitLoss ?? 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.profitLoss ?? 0), 0));
    
    const totalCommission = closedTrades.reduce((sum, trade) => sum + (trade.commission ?? 0), 0);
    const totalSwap = closedTrades.reduce((sum, trade) => sum + (trade.swap ?? 0), 0);

    const netPL = grossProfit - grossLoss - totalCommission - totalSwap;
    
    const tradesForRate = winningTrades.length + losingTrades.length;
    const winRate = tradesForRate > 0 ? (winningTrades.length / tradesForRate) : 0;
    const lossRate = tradesForRate > 0 ? (losingTrades.length / tradesForRate) : 0;

    const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
    
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);

    const expectancy = (winRate * avgWin) - (lossRate * avgLoss);

    // --- Equity Curve Calculation ---
    let runningBalance = 0;
    const equityCurve = closedTrades.map(t => {
        const pl = t.profitLoss ?? 0;
        runningBalance += pl;
        return {
            date: new Date(t.exitDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            fullDate: t.exitDate,
            value: runningBalance,
            pl: pl // Store individual P/L for tooltip
        };
    });

    // --- Streak Calculation ---
    let currentStreak = 0;
    // Iterate backwards from the most recent trade
    for (let i = closedTrades.length - 1; i >= 0; i--) {
        const t = closedTrades[i];
        if (t.result === TradeResult.Win) {
            if (currentStreak >= 0) currentStreak++;
            else break; // Streak broken
        } else if (t.result === TradeResult.Loss) {
            if (currentStreak <= 0) currentStreak--;
            else break; // Streak broken
        }
        // Ignore breakeven for streak purposes? Or break? Let's break on BE for strictness.
        else {
            break;
        }
    }

    return {
      totalTrades,
      netPL,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      breakevenTrades: breakevenTrades.length,
      winRate: winRate * 100,
      lossRate: lossRate * 100,
      avgWin,
      avgLoss,
      profitFactor,
      expectancy,
      equityCurve,
      currentStreak,
    };
  }, [trades]);

  return stats;
};
