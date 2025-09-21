import { useMemo } from 'react';
import { Trade, TradeResult } from '../types';

export const useAnalytics = (trades: Trade[]) => {
  const stats = useMemo(() => {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        netPL: 0,
        winningTrades: 0,
        losingTrades: 0,
        breakevenTrades: 0,
        winRate: 0,
        lossRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        expectancy: 0,
      };
    }

    const closedTrades = trades.filter(t => t.result);
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
    
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;

    const expectancy = (winRate * avgWin) - (lossRate * avgLoss);

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
    };
  }, [trades]);

  return stats;
};