import { Direction } from "../types";

/**
 * Calculates the Reward-to-Risk (R:R) ratio of a trade.
 * @param entryPrice - The entry price of the trade.
 * @param stopLoss - The stop loss price.
 * @param takeProfit - The take profit price.
 * @param direction - The direction of the trade ('Buy' or 'Sell').
 * @returns The R:R ratio, or 0 if risk is zero.
 */
export const calculateRR = (
  entryPrice: number,
  stopLoss: number,
  takeProfit: number,
  direction: Direction
): number => {
  if (!entryPrice || !stopLoss || !takeProfit) {
    return 0;
  }

  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);

  if (risk === 0) {
    return 0; // Avoid division by zero
  }

  // A simple check to ensure SL/TP are on the correct side of the entry
  if (direction === 'Buy') {
    if (stopLoss >= entryPrice || takeProfit <= entryPrice) return 0;
  } else { // Sell
    if (stopLoss <= entryPrice || takeProfit >= entryPrice) return 0;
  }

  return reward / risk;
};

/**
 * Calculates the duration between two dates and formats it into a human-readable string.
 * @param entryDateStr - The entry date as an ISO string.
 * @param exitDateStr - The exit date as an ISO string.
 * @returns A formatted string like "1d 4h 22m", or an empty string if dates are invalid.
 */
export const formatDuration = (entryDateStr?: string | null, exitDateStr?: string | null): string => {
  if (!entryDateStr || !exitDateStr) {
    return '';
  }

  const entryDate = new Date(entryDateStr);
  const exitDate = new Date(exitDateStr);

  if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime()) || exitDate < entryDate) {
    return '';
  }

  let diff = exitDate.getTime() - entryDate.getTime();

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  diff -= days * (1000 * 60 * 60 * 24);

  const hours = Math.floor(diff / (1000 * 60 * 60));
  diff -= hours * (1000 * 60 * 60);

  const minutes = Math.floor(diff / (1000 * 60));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '0m';
};